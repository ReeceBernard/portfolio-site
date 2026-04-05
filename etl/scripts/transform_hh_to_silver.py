"""
Transform HomeHarvest bronze JSON → silver Parquet tables.

Reads from bronze/property_sales_hh/, upserts into the existing silver
properties and sales_transactions tables, and enriches existing qPublic rows
with bedrooms / bathrooms / lat / lon where those columns are currently null.

Silver schema additions (four new nullable columns):
    bedrooms    INTEGER
    bathrooms   DOUBLE
    lat         DOUBLE
    lon         DOUBLE

Examples:
    python scripts/transform_hh_to_silver.py
    python scripts/transform_hh_to_silver.py --county fulton
    python scripts/transform_hh_to_silver.py --date-from 2024-01-01 --date-to 2024-12-31
"""

import hashlib
import sys
import time
from pathlib import Path
from typing import Dict, Optional

import duckdb
import pandas as pd

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import boto3
from bronze.scrapers.homeharvest_scraper import HH_PROPERTY_TYPE_MAP
from utils.config import Config
from utils.logger import setup_logger
from utils.s3_client import S3Client
from utils.transformers import extract_zip_code, normalize_address

logger = setup_logger(__name__)

# Silver columns that HH adds (nullable for pre-existing qPublic rows)
HH_NEW_COLUMNS = ["bedrooms", "bathrooms", "lat", "lon"]


# ---------------------------------------------------------------------------
# property_id generation for HH records (no parcel_id available)
# ---------------------------------------------------------------------------

def _hh_property_id(county: str, normalized_address: Optional[str]) -> str:
    """
    Stable property_id for HomeHarvest records.

    Format: "hh:<first 16 chars of sha256(county|normalized_address)>"
    The "hh:" prefix prevents collision with qPublic IDs ("county:parcel_id").
    """
    addr = normalized_address or ""
    raw = f"{county}|{addr}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"hh:{digest}"


# ---------------------------------------------------------------------------
# Load HH bronze from S3
# ---------------------------------------------------------------------------

def load_hh_bronze(
    county_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load HomeHarvest bronze JSON files from S3 via DuckDB.

    Args:
        county_filter: Restrict to a single county (lowercase), or None for all.
        date_from: Only include files on or after this date (YYYY-MM-DD).
        date_to: Only include files on or before this date (YYYY-MM-DD).

    Returns:
        DataFrame with all matching bronze records, empty if none found.
    """
    logger.info("Loading HH bronze data from S3...")
    t0 = time.time()

    s3 = boto3.client("s3")
    prefix = "bronze/property_sales_hh/"
    paginator = s3.get_paginator("list_objects_v2")

    # Collect matching S3 keys
    keys = []
    for page in paginator.paginate(Bucket=Config.S3_BUCKET_NAME, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # key format: bronze/property_sales_hh/{county}/{YYYY-MM-DD}.json
            parts = key.split("/")
            if len(parts) < 4:
                continue
            county = parts[2]
            date_str = parts[3].replace(".json", "")

            if county_filter and county != county_filter:
                continue
            if date_from and date_str < date_from:
                continue
            if date_to and date_str > date_to:
                continue
            keys.append(key)

    if not keys:
        logger.warning("No HH bronze files found matching filters.")
        return pd.DataFrame()

    logger.info(f"Found {len(keys)} bronze file(s) to load")

    conn = duckdb.connect()
    conn.execute("INSTALL httpfs; LOAD httpfs;")

    frames = []
    for i, key in enumerate(keys, 1):
        s3_path = f"s3://{Config.S3_BUCKET_NAME}/{key}"
        try:
            df = conn.execute(
                f"SELECT * FROM read_json_auto('{s3_path}', union_by_name=true)"
            ).df()
            frames.append(df)
            if i % 20 == 0 or i == len(keys):
                logger.info(f"  Loaded {i}/{len(keys)} files")
        except Exception as e:
            logger.warning(f"Skipping {key}: {e}")

    conn.close()

    if not frames:
        return pd.DataFrame()

    result = pd.concat(frames, ignore_index=True)
    logger.info(f"Loaded {len(result):,} total HH records in {time.time()-t0:.1f}s")
    return result


# ---------------------------------------------------------------------------
# Transform HH bronze → silver-compatible DataFrames
# ---------------------------------------------------------------------------

def transform_hh_bronze(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Transform raw HH bronze DataFrame into silver-compatible properties and
    sales_transactions DataFrames.

    Returns:
        {"properties": pd.DataFrame, "sales_transactions": pd.DataFrame}
    """
    logger.info(f"Transforming {len(df):,} HH bronze records...")
    t0 = time.time()

    # ---- Step 1: basic cleaning ----
    logger.info("Step 1/3: Cleaning HH bronze data...")
    df = df.copy()
    df["sale_price"] = pd.to_numeric(df.get("sale_price"), errors="coerce")
    df["bedrooms"] = pd.to_numeric(df.get("bedrooms"), errors="coerce")
    df["bathrooms"] = pd.to_numeric(df.get("bathrooms"), errors="coerce")
    df["lat"] = pd.to_numeric(df.get("lat"), errors="coerce")
    df["lon"] = pd.to_numeric(df.get("lon"), errors="coerce")
    df["square_ft"] = pd.to_numeric(df.get("square_ft"), errors="coerce")
    df["year_built"] = pd.to_numeric(df.get("year_built"), errors="coerce")

    # Parse sale_date
    df["sale_date"] = pd.to_datetime(df.get("sale_date"), errors="coerce")

    # Drop rows with no address or no county
    df = df.dropna(subset=["county"])
    df["address"] = df["address"].fillna("")

    # ---- Step 2: derived fields ----
    logger.info("Step 2/3: Deriving property IDs and property types...")

    df["normalized_address"] = df["address"].apply(normalize_address)
    df["zip_code"] = df.apply(
        lambda r: r.get("zip_code") or extract_zip_code(r.get("address")), axis=1
    )

    # property_id
    df["property_id"] = df.apply(
        lambda r: _hh_property_id(r["county"], r.get("normalized_address")), axis=1
    )

    # property_type from HH style column
    def _map_style(style_val):
        if pd.isna(style_val):
            return "other"
        return HH_PROPERTY_TYPE_MAP.get(str(style_val).upper(), "other")

    if "property_type" in df.columns:
        # bronze already has mapped property_type
        df["property_type"] = df["property_type"].fillna("other")
    else:
        df["property_type"] = df.get("style", pd.Series(dtype=str)).apply(_map_style)

    # sale_id: property_id + sale_date
    df["sale_id"] = (
        df["property_id"] + ":"
        + df["sale_date"].dt.strftime("%Y-%m-%d").fillna("unknown")
    )

    # Validity
    df["qualified_sale"] = True
    df["is_valid"] = df["sale_price"] > 1000
    df["sales_validity"] = "MLS_SOLD"
    df["data_source"] = "homeharvest"
    df["grantor"] = None
    df["grantee"] = None
    df["grantor_entity_id"] = None
    df["grantee_entity_id"] = None

    scraped_col = "scraped_at"
    df["scraped_at"] = pd.to_datetime(df.get(scraped_col), errors="coerce")

    logger.info(f"Steps 1-2 done in {time.time()-t0:.1f}s")

    # ---- Step 3: build output tables ----
    logger.info("Step 3/3: Building properties and sales_transactions tables...")

    # --- sales_transactions ---
    tx_cols = [
        "sale_id", "property_id", "sale_date", "sale_price",
        "grantor", "grantee", "grantor_entity_id", "grantee_entity_id",
        "qualified_sale", "sales_validity", "is_valid", "data_source", "scraped_at",
    ]
    sales_transactions = df[[c for c in tx_cols if c in df.columns]].copy()
    # Fill any missing tx columns with None
    for col in tx_cols:
        if col not in sales_transactions.columns:
            sales_transactions[col] = None
    sales_transactions = sales_transactions[tx_cols]
    sales_transactions = sales_transactions.drop_duplicates(subset=["sale_id"], keep="last")

    # --- properties: latest record per property_id ---
    prop_cols = [
        "property_id", "county", "address", "normalized_address", "zip_code",
        "property_type", "square_ft", "year_built",
        "bedrooms", "bathrooms", "lat", "lon",
        "sale_date",   # used for recency ordering
        "scraped_at",
    ]
    props_df = df[[c for c in prop_cols if c in df.columns]].copy()
    # Keep latest record per property_id (by sale_date)
    props_df = (
        props_df.sort_values("sale_date", ascending=False, na_position="last")
        .drop_duplicates(subset=["property_id"], keep="first")
    )
    # Rename for silver schema alignment
    props_df = props_df.rename(columns={"sale_date": "first_seen", "scraped_at": "last_updated"})

    logger.info(
        f"Transform done: {len(sales_transactions):,} tx | {len(props_df):,} properties "
        f"({time.time()-t0:.1f}s)"
    )

    return {"properties": props_df, "sales_transactions": sales_transactions}


# ---------------------------------------------------------------------------
# Ensure silver DataFrames have the new nullable columns
# ---------------------------------------------------------------------------

def _ensure_new_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add bedrooms/bathrooms/lat/lon columns (as pd.NA) if absent."""
    type_map = {
        "bedrooms": pd.Int64Dtype(),
        "bathrooms": float,
        "lat": float,
        "lon": float,
    }
    for col, dtype in type_map.items():
        if col not in df.columns:
            if dtype == pd.Int64Dtype():
                df[col] = pd.array([pd.NA] * len(df), dtype=pd.Int64Dtype())
            else:
                df[col] = pd.NA
    return df


# ---------------------------------------------------------------------------
# Upsert HH data into existing silver tables
# ---------------------------------------------------------------------------

def upsert_into_silver(
    hh_tables: Dict[str, pd.DataFrame],
    s3_client: S3Client,
) -> Dict[str, int]:
    """
    Merge HH-derived tables into the existing silver layer.

    Logic:
    - Transactions: append rows whose sale_id is not already present.
    - Properties:
        - Brand-new property_id → append.
        - Existing property_id with null beds/baths/lat/lon → patch-fill from HH.

    Returns:
        Stats dict with counts for logging.
    """
    logger.info("Loading existing silver tables...")

    try:
        silver_props = s3_client.read_silver("properties")
        silver_tx = s3_client.read_silver("sales_transactions")
    except Exception as e:
        logger.warning(f"Could not load existing silver ({e}); starting fresh.")
        silver_props = pd.DataFrame()
        silver_tx = pd.DataFrame()

    # Ensure new columns exist in existing silver tables
    silver_props = _ensure_new_columns(silver_props)
    silver_tx = _ensure_new_columns(silver_tx)

    hh_props = hh_tables["properties"]
    hh_tx = hh_tables["sales_transactions"]

    # ---- Transactions upsert ----
    existing_sale_ids = set(silver_tx["sale_id"].dropna()) if len(silver_tx) > 0 else set()
    new_tx = hh_tx[~hh_tx["sale_id"].isin(existing_sale_ids)]
    dup_tx_count = len(hh_tx) - len(new_tx)

    # Ensure new nullable cols exist in HH tx before concat
    new_tx = _ensure_new_columns(new_tx)

    merged_tx = pd.concat([silver_tx, new_tx], ignore_index=True) if len(new_tx) > 0 else silver_tx

    # ---- Properties upsert ----
    existing_prop_ids = set(silver_props["property_id"].dropna()) if len(silver_props) > 0 else set()

    hh_new_props = hh_props[~hh_props["property_id"].isin(existing_prop_ids)].copy()
    hh_existing_props = hh_props[hh_props["property_id"].isin(existing_prop_ids)].copy()

    new_props_count = len(hh_new_props)

    # Patch-fill: for existing rows, fill null beds/baths/lat/lon from HH
    patch_count = 0
    if len(hh_existing_props) > 0 and len(silver_props) > 0:
        silver_props = silver_props.set_index("property_id")
        hh_patch = hh_existing_props.set_index("property_id")[HH_NEW_COLUMNS]

        for col in HH_NEW_COLUMNS:
            if col not in silver_props.columns:
                silver_props[col] = pd.NA

        # Only patch rows that currently have null in all four HH columns
        null_mask = silver_props.index.isin(hh_patch.index)
        for col in HH_NEW_COLUMNS:
            needs_patch = silver_props[col].isna() & null_mask
            silver_props.loc[needs_patch, col] = hh_patch.reindex(
                silver_props.loc[needs_patch].index
            )[col]

        patch_count = null_mask.sum()
        silver_props = silver_props.reset_index()

    # Align new HH props to silver schema before concat
    if len(silver_props) > 0 and len(hh_new_props) > 0:
        for col in silver_props.columns:
            if col not in hh_new_props.columns:
                hh_new_props[col] = pd.NA
        hh_new_props = hh_new_props[silver_props.columns]

    merged_props = (
        pd.concat([silver_props, hh_new_props], ignore_index=True)
        if len(hh_new_props) > 0
        else silver_props
    )

    # Write back
    logger.info("Writing merged silver tables to S3...")
    s3_client.write_silver("properties", merged_props)
    s3_client.write_silver("sales_transactions", merged_tx)

    return {
        "new_properties": new_props_count,
        "patch_updated": patch_count,
        "new_transactions": len(new_tx),
        "dup_transactions": dup_tx_count,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Transform HomeHarvest bronze → silver tables",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/transform_hh_to_silver.py
  python scripts/transform_hh_to_silver.py --county fulton
  python scripts/transform_hh_to_silver.py --date-from 2024-01-01 --date-to 2024-12-31
        """,
    )
    parser.add_argument("--county", type=str, default=None,
                        help="Restrict to a single county (lowercase)")
    parser.add_argument("--date-from", type=str, default=None,
                        help="Only load files on or after YYYY-MM-DD")
    parser.add_argument("--date-to", type=str, default=None,
                        help="Only load files on or before YYYY-MM-DD")

    args = parser.parse_args()

    t_start = time.time()

    logger.info("=" * 60)
    logger.info("HomeHarvest → Silver Transform")
    logger.info("=" * 60)

    # Load HH bronze
    bronze_df = load_hh_bronze(
        county_filter=args.county,
        date_from=args.date_from,
        date_to=args.date_to,
    )

    if bronze_df.empty:
        logger.warning("No HH bronze records found — nothing to transform.")
        return 0

    # Transform to silver-compatible tables
    hh_tables = transform_hh_bronze(bronze_df)

    # Upsert into existing silver
    s3_client = S3Client(Config.S3_BUCKET_NAME)
    stats = upsert_into_silver(hh_tables, s3_client)

    total_runtime = int(time.time() - t_start)

    logger.info("\n" + "=" * 60)
    logger.info("TRANSFORM COMPLETE")
    logger.info("=" * 60)
    logger.info(f"New properties appended:       {stats['new_properties']:>7,}")
    logger.info(f"Properties patch-updated:      {stats['patch_updated']:>7,}  (beds/baths/lat/lon filled from HH)")
    logger.info(f"New transactions appended:     {stats['new_transactions']:>7,}")
    logger.info(f"Duplicate transactions skipped:{stats['dup_transactions']:>7,}")
    logger.info(f"Total runtime: {total_runtime}s")

    return 0


if __name__ == "__main__":
    sys.exit(main())
