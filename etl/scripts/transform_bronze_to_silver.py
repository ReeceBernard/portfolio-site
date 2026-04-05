"""
Transform Bronze layer (raw JSON) to Silver layer (clean Parquet).

Creates three normalized tables:
- properties.parquet: Unique properties with latest characteristics
- sales_transactions.parquet: All sale events with entity links
- entities.parquet: Normalized buyer/seller entities

Example:
    # Transform from S3
    python scripts/transform_bronze_to_silver.py

    # Transform from local files
    python scripts/transform_bronze_to_silver.py --local

    # Resume from checkpoint
    python scripts/transform_bronze_to_silver.py --resume
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
import duckdb
import pandas as pd

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger
from utils.transformers import (
    normalize_entity_name,
    generate_entity_id,
    infer_entity_type,
    map_property_type,
    extract_zip_code,
    normalize_address
)

logger = setup_logger(__name__)

CHECKPOINT_FILE = Path(__file__).parent.parent / "data" / "silver_transform_checkpoint.json"


def load_bronze_data(local: bool = False, bronze_path: str = None) -> pd.DataFrame:
    """
    Load all bronze JSON files into a DataFrame.

    Args:
        local: Load from local files instead of S3
        bronze_path: Override bronze data path

    Returns:
        DataFrame with all bronze sales data
    """
    import boto3
    import time

    logger.info("Loading bronze data...")
    t0 = time.time()

    if local:
        # Load from local files
        if bronze_path:
            data_path = Path(bronze_path)
        else:
            data_path = Path(__file__).parent.parent / "data" / "backfill"

        json_files = list(data_path.glob("*.json"))
        logger.info(f"Found {len(json_files)} local JSON files")

        all_data = []
        for i, file in enumerate(json_files, 1):
            with open(file, 'r') as f:
                data = json.load(f)
                all_data.extend(data)
            if i % 10 == 0 or i == len(json_files):
                logger.info(f"  Loaded {i}/{len(json_files)} files ({len(all_data):,} records so far)")

        df = pd.DataFrame(all_data)

    else:
        # Discover counties via S3 listing, then read each separately for progress
        s3 = boto3.client("s3")
        prefix = "bronze/property_sales/"
        paginator = s3.get_paginator("list_objects_v2")

        county_prefixes = set()
        for page in paginator.paginate(Bucket=Config.S3_BUCKET_NAME, Prefix=prefix, Delimiter="/"):
            for cp in page.get("CommonPrefixes", []):
                county_prefixes.add(cp["Prefix"])

        if not county_prefixes:
            # Fallback: single glob if no county subdirectories found
            county_prefixes = {prefix}

        counties = sorted(county_prefixes)
        logger.info(f"Found {len(counties)} county partition(s): {[c.split('/')[-2] for c in counties]}")

        conn = duckdb.connect()
        conn.execute("INSTALL httpfs; LOAD httpfs;")

        frames = []
        for i, county_prefix in enumerate(counties, 1):
            county_name = county_prefix.rstrip("/").split("/")[-1]
            s3_path = f"s3://{Config.S3_BUCKET_NAME}/{county_prefix}*.json"
            logger.info(f"  [{i}/{len(counties)}] Reading {county_name} from {s3_path} ...")
            t_county = time.time()
            county_df = conn.execute(f"""
                SELECT * FROM read_json_auto('{s3_path}', union_by_name=true)
            """).df()
            elapsed = time.time() - t_county
            logger.info(f"  [{i}/{len(counties)}] {county_name}: {len(county_df):,} records ({elapsed:.1f}s)")
            frames.append(county_df)

        conn.close()
        df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    elapsed_total = time.time() - t0
    logger.info(f"Loaded {len(df):,} total records in {elapsed_total:.1f}s")
    return df


def transform_to_silver(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Transform bronze DataFrame to silver tables.

    Args:
        df: Bronze sales data

    Returns:
        Dictionary of silver DataFrames: {
            'properties': ...,
            'sales_transactions': ...,
            'entities': ...
        }
    """
    import time
    logger.info(f"Starting bronze → silver transformation ({len(df):,} input records)...")
    t_start = time.time()

    conn = duckdb.connect()

    # Register bronze DataFrame
    conn.register('bronze_raw', df)

    # ========================================
    # Step 1: Clean and validate sales data
    # ========================================
    logger.info("Step 1/5: Cleaning sales data...")
    t1 = time.time()

    sales_clean = conn.execute("""
        SELECT
            county,
            parcel_id,
            address,
            owner_name,
            grantor,
            grantee,
            sale_date,
            CAST(NULLIF(REGEXP_REPLACE(sale_price, '[^0-9.]', '', 'g'), '') AS DOUBLE) as sale_price,
            qualified_sales,
            sales_validity,
            CAST(NULLIF(REGEXP_REPLACE(acres, '[^0-9.]', '', 'g'), '') AS DOUBLE) as acres,
            parcel_class,
            tax_district,
            TRY_CAST(REGEXP_REPLACE(year_built, '[^0-9]', '', 'g') AS INTEGER) as year_built,
            CAST(NULLIF(REGEXP_REPLACE(square_ft, '[^0-9.]', '', 'g'), '') AS DOUBLE) as square_ft,
            neighborhood,
            zoning,
            scraped_at
        FROM bronze_raw
        WHERE parcel_id IS NOT NULL
          AND parcel_id != ''
          AND county IS NOT NULL
    """).df()

    logger.info(f"Step 1/5 done: {len(sales_clean):,} records after cleaning ({time.time()-t1:.1f}s)")

    # ========================================
    # Step 2: Add derived fields with Python
    # ========================================
    logger.info("Step 2/5: Adding derived fields...")
    t2 = time.time()

    # Property ID (composite key)
    sales_clean['property_id'] = sales_clean['county'] + ':' + sales_clean['parcel_id']

    # Normalized addresses
    sales_clean['normalized_address'] = sales_clean['address'].apply(normalize_address)
    sales_clean['zip_code'] = sales_clean['address'].apply(extract_zip_code)

    # Property type mapping
    property_types = sales_clean['parcel_class'].apply(map_property_type)
    sales_clean['property_type'] = [pt[0] for pt in property_types]
    sales_clean['parcel_class_original'] = [pt[1] for pt in property_types]

    # Parse sale dates
    sales_clean['sale_date_parsed'] = pd.to_datetime(sales_clean['sale_date'], format='%m/%d/%Y', errors='coerce')

    # Validity flags
    # Normalize both fields for matching
    qual_raw = sales_clean['qualified_sales'].fillna('').str.lower().str.strip()
    validity_raw = sales_clean['sales_validity'].fillna('').str.lower().str.strip()

    # qualified_sale: word "qualified" in qualified_sales field OR county codes
    # (DeKalb and others use "QY" = Qualified Yes in sales_validity instead of the word "qualified")
    sales_clean['is_qualified'] = (
        qual_raw.str.contains('qualified', na=False) |
        qual_raw.isin(['q', 'qy', 'yes', 'y']) |
        (validity_raw == 'qy') |
        validity_raw.str.startswith('valid') |
        validity_raw.str.startswith('0:')   # "0: Valid Sale FMV"
    )

    # is_valid: arm's-length market sale at reasonable price
    # Exclude "Z: Invalid Sale" (previous contains('valid') matched this as a false positive)
    sales_clean['is_valid'] = (
        (sales_clean['sale_price'] > 1000) &
        (
            validity_raw.str.startswith('valid') |   # "Valid Sale", "VALID SALE"
            validity_raw.str.startswith('0:') |      # "0: Valid Sale FMV"
            (validity_raw == 'qy')                   # Qualified Yes county code
        )
    )

    # Entity normalization
    logger.info("Normalizing entity names...")
    sales_clean['grantor_normalized'] = sales_clean['grantor'].apply(normalize_entity_name)
    sales_clean['grantee_normalized'] = sales_clean['grantee'].apply(normalize_entity_name)
    sales_clean['grantor_entity_id'] = sales_clean['grantor_normalized'].apply(generate_entity_id)
    sales_clean['grantee_entity_id'] = sales_clean['grantee_normalized'].apply(generate_entity_id)

    # Scraped timestamp
    sales_clean['scraped_at_parsed'] = pd.to_datetime(sales_clean['scraped_at'], errors='coerce')

    logger.info(f"Step 2/5 done: derived fields added ({time.time()-t2:.1f}s)")

    # ========================================
    # Step 3: Create Entities Table
    # ========================================
    logger.info("Step 3/5: Creating entities table...")
    t3 = time.time()

    # Collect all buyers
    buyers = sales_clean[['grantee_entity_id', 'grantee_normalized', 'grantee', 'sale_date_parsed']].copy()
    buyers.columns = ['entity_id', 'normalized_name', 'raw_name', 'transaction_date']

    # Collect all sellers
    sellers = sales_clean[['grantor_entity_id', 'grantor_normalized', 'grantor', 'sale_date_parsed']].copy()
    sellers.columns = ['entity_id', 'normalized_name', 'raw_name', 'transaction_date']

    # Combine
    all_entities = pd.concat([buyers, sellers], ignore_index=True)
    all_entities = all_entities[all_entities['entity_id'].notna()]

    # Aggregate by entity
    entities = all_entities.groupby('entity_id').agg({
        'normalized_name': 'first',
        'raw_name': lambda x: list(set(x.dropna())),  # All unique raw names
        'transaction_date': ['min', 'max', 'count']
    }).reset_index()

    entities.columns = ['entity_id', 'normalized_name', 'raw_names', 'first_transaction', 'last_transaction', 'transaction_count']

    # Infer entity type
    entities['entity_type'] = entities['normalized_name'].apply(infer_entity_type)

    logger.info(f"Step 3/5 done: {len(entities):,} unique entities ({time.time()-t3:.1f}s)")

    # ========================================
    # Step 4: Create Sales Transactions Table
    # ========================================
    logger.info("Step 4/5: Creating sales transactions table...")
    t4 = time.time()

    sales_transactions = sales_clean[[
        'property_id',
        'sale_date_parsed',
        'sale_price',
        'grantor',
        'grantee',
        'grantor_entity_id',
        'grantee_entity_id',
        'is_qualified',
        'sales_validity',
        'is_valid',
        'scraped_at_parsed'
    ]].copy()

    # Create sale_id
    sales_transactions['sale_id'] = (
        sales_transactions['property_id'] + ':' +
        sales_transactions['sale_date_parsed'].dt.strftime('%Y-%m-%d')
    )

    # Rename columns
    sales_transactions = sales_transactions.rename(columns={
        'sale_date_parsed': 'sale_date',
        'scraped_at_parsed': 'scraped_at',
        'is_qualified': 'qualified_sale'
    })

    # Add data source
    sales_transactions['data_source'] = 'qpublic'

    # Reorder columns
    sales_transactions = sales_transactions[[
        'sale_id',
        'property_id',
        'sale_date',
        'sale_price',
        'grantor',
        'grantee',
        'grantor_entity_id',
        'grantee_entity_id',
        'qualified_sale',
        'sales_validity',
        'is_valid',
        'data_source',
        'scraped_at'
    ]]

    # Drop duplicates (same property, same date)
    before_dedup = len(sales_transactions)
    sales_transactions = sales_transactions.drop_duplicates(subset=['sale_id'], keep='last')
    logger.info(f"Removed {before_dedup - len(sales_transactions):,} duplicate sales")

    logger.info(f"Step 4/5 done: {len(sales_transactions):,} sales transactions ({time.time()-t4:.1f}s)")

    # ========================================
    # Step 5: Create Properties Table
    # ========================================
    logger.info("Step 5/5: Creating properties table...")
    t5 = time.time()

    # Get latest record for each property
    conn.register('sales_clean', sales_clean)

    properties = conn.execute("""
        SELECT
            property_id,
            county,
            parcel_id,
            FIRST(address ORDER BY sale_date_parsed DESC) as address,
            FIRST(normalized_address ORDER BY sale_date_parsed DESC) as normalized_address,
            FIRST(zip_code ORDER BY sale_date_parsed DESC) as zip_code,
            FIRST(property_type ORDER BY sale_date_parsed DESC) as property_type,
            FIRST(parcel_class_original ORDER BY sale_date_parsed DESC) as parcel_class,
            FIRST(square_ft ORDER BY sale_date_parsed DESC) as square_ft,
            FIRST(acres ORDER BY sale_date_parsed DESC) as acres,
            FIRST(year_built ORDER BY sale_date_parsed DESC) as year_built,
            FIRST(zoning ORDER BY sale_date_parsed DESC) as zoning,
            FIRST(neighborhood ORDER BY sale_date_parsed DESC) as neighborhood,
            FIRST(tax_district ORDER BY sale_date_parsed DESC) as tax_district,
            MIN(sale_date_parsed) as first_seen,
            MAX(scraped_at_parsed) as last_updated
        FROM sales_clean
        WHERE property_id IS NOT NULL
        GROUP BY property_id, county, parcel_id
    """).df()

    logger.info(f"Step 5/5 done: {len(properties):,} unique properties ({time.time()-t5:.1f}s)")
    logger.info(f"Transform complete in {time.time()-t_start:.1f}s total")

    conn.close()

    return {
        'properties': properties,
        'sales_transactions': sales_transactions,
        'entities': entities
    }


def write_silver_tables(tables: Dict[str, pd.DataFrame], local: bool = False, output_path: str = None):
    """
    Write silver tables to parquet files.

    Args:
        tables: Dictionary of DataFrames to write
        local: Write to local files instead of S3
        output_path: Override output path
    """
    logger.info("Writing silver tables...")

    if local:
        if output_path:
            base_path = Path(output_path)
        else:
            base_path = Path(__file__).parent.parent / "data" / "silver"

        base_path.mkdir(parents=True, exist_ok=True)

        for table_name, df in tables.items():
            file_path = base_path / f"{table_name}.parquet"
            df.to_parquet(file_path, index=False, engine='pyarrow')
            logger.info(f"✅ {table_name}: {len(df):,} rows → {file_path}")

    else:
        # Write to S3
        s3_client = S3Client(Config.S3_BUCKET_NAME)

        import time
        for i, (table_name, df) in enumerate(tables.items(), 1):
            logger.info(f"  [{i}/{len(tables)}] Uploading {table_name} ({len(df):,} rows) → s3://{Config.S3_BUCKET_NAME}/silver/{table_name}.parquet ...")
            t_w = time.time()
            s3_client.write_silver(table_name, df)
            logger.info(f"  [{i}/{len(tables)}] ✅ {table_name} done ({time.time()-t_w:.1f}s)")


def main():
    """Run bronze to silver transformation."""
    import argparse

    parser = argparse.ArgumentParser(description='Transform bronze to silver layer')
    parser.add_argument('--local', action='store_true', help='Use local files instead of S3')
    parser.add_argument('--bronze-path', type=str, help='Override bronze data path')
    parser.add_argument('--output-path', type=str, help='Override silver output path')

    args = parser.parse_args()

    try:
        logger.info("="*60)
        logger.info("Bronze → Silver Transformation")
        logger.info("="*60)

        # Load bronze data
        bronze_df = load_bronze_data(local=args.local, bronze_path=args.bronze_path)

        # Transform
        silver_tables = transform_to_silver(bronze_df)

        # Write output
        write_silver_tables(silver_tables, local=args.local, output_path=args.output_path)

        logger.info("\n" + "="*60)
        logger.info("✅ Transformation Complete!")
        logger.info("="*60)
        logger.info(f"Properties: {len(silver_tables['properties']):,}")
        logger.info(f"Sales: {len(silver_tables['sales_transactions']):,}")
        logger.info(f"Entities: {len(silver_tables['entities']):,}")

        return 0

    except Exception as e:
        logger.error(f"Transformation failed: {str(e)}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
