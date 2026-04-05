"""
Gold layer: geocode silver properties using US Census Batch Geocoder.

Adds lat, lon, zip_code to every property that has at least one valid
qualified sale — the subset actually used by the comps query.

Output: s3://dealscout-data-dev/gold/properties_geocoded.parquet

Census geocoder docs: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf
  - Free, no API key, US addresses only
  - 10,000 addresses per batch
  - Returns lat/lon + matched address (which contains zip)

Usage:
    python scripts/geocode_properties.py              # full run
    python scripts/geocode_properties.py --limit 500  # test with small sample
    python scripts/geocode_properties.py --resume     # skip already-geocoded batches
"""

import sys
import json
import time
import argparse
import io
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
import pandas as pd
import duckdb
import boto3

from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)

BUCKET = Config.S3_BUCKET_NAME
BATCH_SIZE = 9_000          # stay under Census 10k limit
CHECKPOINT_KEY = "gold/geocode_checkpoint.json"
OUTPUT_KEY = "gold/properties_geocoded.parquet"
CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"


# ── Census geocoder ───────────────────────────────────────────────────────────

def geocode_batch(batch: pd.DataFrame) -> pd.DataFrame:
    """
    Send one batch to Census geocoder.
    batch must have: property_id, address, county
    Returns DataFrame with: property_id, lat, lon, zip_code, match_status
    """
    lines = []
    for _, row in batch.iterrows():
        # Leave city blank — qPublic addresses don't include city, county name confuses geocoder
        addr = str(row['address']).replace('"', "'")
        lines.append(f'"{row["property_id"]}","{addr}","","GA",""')
    csv_payload = "\n".join(lines)

    for attempt in range(3):
        try:
            resp = requests.post(
                CENSUS_URL,
                files={"addressFile": ("addresses.csv", csv_payload.encode("utf-8"), "text/csv")},
                data={"benchmark": "Public_AR_Current"},
                timeout=180,
            )
            resp.raise_for_status()
            break
        except Exception as e:
            if attempt == 2:
                raise
            logger.warning(f"  Census request failed (attempt {attempt+1}): {e} — retrying in 10s")
            time.sleep(10)

    result = pd.read_csv(
        io.StringIO(resp.text),
        header=None,
        names=["property_id", "input_address", "match_status", "match_type",
               "matched_address", "coordinates", "tiger_line_id", "side",
               "state_fips", "county_fips", "tract", "block"],
        dtype=str,
        on_bad_lines="skip",
    )

    out = result[["property_id", "match_status", "match_type", "matched_address", "coordinates"]].copy()
    out["lat"] = None
    out["lon"] = None
    out["zip_code"] = None

    matched = out["match_status"].str.strip().str.lower() == "match"
    if matched.any():
        coords = out.loc[matched, "coordinates"].str.split(",", expand=True)
        out.loc[matched, "lon"] = pd.to_numeric(coords[0], errors="coerce")
        out.loc[matched, "lat"] = pd.to_numeric(coords[1], errors="coerce")
        out.loc[matched, "zip_code"] = (
            out.loc[matched, "matched_address"].str.extract(r"\b(\d{5})\b", expand=False)
        )

    return out[["property_id", "lat", "lon", "zip_code", "match_status"]]


# ── S3 checkpoint helpers ─────────────────────────────────────────────────────

def load_checkpoint(s3) -> set:
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=CHECKPOINT_KEY)
        data = json.loads(obj["Body"].read())
        return set(data.get("completed_batches", []))
    except s3.exceptions.NoSuchKey:
        return set()
    except Exception:
        return set()


def save_checkpoint(s3, completed: set):
    s3.put_object(
        Bucket=BUCKET,
        Key=CHECKPOINT_KEY,
        Body=json.dumps({"completed_batches": list(completed)}),
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Cap total properties (for testing)")
    parser.add_argument("--resume", action="store_true", help="Skip already-completed batches")
    args = parser.parse_args()

    s3 = boto3.client("s3")

    # Load silver: only properties with at least one valid qualified sale
    logger.info("Loading properties with valid qualified sales from silver...")
    conn = duckdb.connect()
    conn.execute("INSTALL httpfs; LOAD httpfs;")

    limit_clause = f"LIMIT {args.limit}" if args.limit else ""
    props = conn.execute(f"""
        SELECT DISTINCT p.property_id, p.address, p.county
        FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') p
        JOIN read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') s
            ON p.property_id = s.property_id
        WHERE s.is_valid = true
          AND s.qualified_sale = true
        {limit_clause}
    """).df()
    conn.close()

    total = len(props)
    logger.info(f"  {total:,} properties to geocode")

    # Load checkpoint
    completed_batches = load_checkpoint(s3) if args.resume else set()
    if completed_batches:
        logger.info(f"  Resuming: {len(completed_batches)} batches already done")

    # Split into batches
    batches = [props.iloc[i:i+BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
    logger.info(f"  {len(batches)} batches of up to {BATCH_SIZE:,}")

    all_results = []

    for i, batch in enumerate(batches):
        batch_id = str(i)
        if batch_id in completed_batches:
            logger.info(f"  Batch {i+1}/{len(batches)}: skipped (already done)")
            continue

        logger.info(f"  Batch {i+1}/{len(batches)}: geocoding {len(batch):,} addresses...")
        t0 = time.time()

        try:
            result = geocode_batch(batch)
        except Exception as e:
            logger.error(f"  Batch {i+1} failed: {e}")
            continue

        matched = (result["match_status"].str.strip().str.lower() == "match").sum()
        elapsed = time.time() - t0
        match_pct = 100 * matched / len(batch)
        logger.info(f"  Batch {i+1}/{len(batches)}: {matched}/{len(batch)} matched ({match_pct:.0f}%) in {elapsed:.1f}s")

        all_results.append(result)
        completed_batches.add(batch_id)
        save_checkpoint(s3, completed_batches)

        # Be polite to the Census API
        time.sleep(1)

    if not all_results:
        logger.error("No results collected — nothing to write")
        return 1

    # Merge geocoded coords back onto full silver properties table
    logger.info("Merging geocoded coords with silver properties...")
    conn = duckdb.connect()
    conn.execute("INSTALL httpfs; LOAD httpfs;")

    silver_props = conn.execute(f"""
        SELECT * FROM read_parquet('s3://{BUCKET}/silver/properties.parquet')
    """).df()
    conn.close()

    geocoded = pd.concat(all_results, ignore_index=True)

    # Drop existing zip_code from silver (it's all null) to avoid _x/_y suffix conflicts
    silver_props = silver_props.drop(columns=["zip_code"], errors="ignore")

    enriched = silver_props.merge(
        geocoded[["property_id", "lat", "lon", "zip_code"]],
        on="property_id",
        how="left",
    )

    matched_total = enriched["lat"].notna().sum()
    logger.info(f"  {matched_total:,}/{len(enriched):,} properties have lat/lon ({100*matched_total/len(enriched):.0f}%)")
    logger.info(f"  {enriched['zip_code'].notna().sum():,} properties have zip_code")

    # Write to gold
    logger.info(f"Writing to s3://{BUCKET}/{OUTPUT_KEY} ...")
    tmp = "/tmp/properties_geocoded.parquet"
    enriched.to_parquet(tmp, index=False, engine="pyarrow")
    s3.upload_file(tmp, BUCKET, OUTPUT_KEY)
    Path(tmp).unlink()
    logger.info("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
