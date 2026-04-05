"""
Transform Silver layer (clean Parquet) to Gold layer (analytics-ready).

Creates:
- property_sales_history.parquet: Denormalized join of properties + sales + entities

Example:
    python scripts/transform_silver_to_gold.py
    python scripts/transform_silver_to_gold.py --local
"""

import sys
from pathlib import Path
from datetime import datetime
import duckdb
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)


def load_silver_tables(local: bool = False, silver_path: str = None) -> dict:
    """
    Load silver parquet tables.

    Returns:
        Dictionary of DataFrames: {properties, sales, entities}
    """
    logger.info("Loading silver tables...")

    if local:
        base_path = Path(silver_path) if silver_path else Path(__file__).parent.parent / "data" / "silver"
        properties = pd.read_parquet(base_path / "properties.parquet")
        sales = pd.read_parquet(base_path / "sales_transactions.parquet")
        entities = pd.read_parquet(base_path / "entities.parquet")

    else:
        conn = duckdb.connect()
        conn.execute("INSTALL httpfs;")
        conn.execute("LOAD httpfs;")

        s3_bucket = Config.S3_BUCKET_NAME

        properties = conn.execute(f"""
            SELECT * FROM read_parquet('s3://{s3_bucket}/silver/properties.parquet')
        """).df()

        sales = conn.execute(f"""
            SELECT * FROM read_parquet('s3://{s3_bucket}/silver/sales_transactions.parquet')
        """).df()

        entities = conn.execute(f"""
            SELECT * FROM read_parquet('s3://{s3_bucket}/silver/entities.parquet')
        """).df()

        conn.close()

    logger.info(f"Loaded: {len(properties):,} properties, {len(sales):,} sales, {len(entities):,} entities")

    return {'properties': properties, 'sales': sales, 'entities': entities}


def create_property_sales_history(conn: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Create denormalized property sales history table.

    Joins properties + sales + entities with calculated metrics.
    """
    logger.info("Creating property_sales_history...")

    result = conn.execute("""
        WITH sales_with_context AS (
            SELECT
                s.sale_id,
                s.property_id,
                s.sale_date,
                s.sale_price,
                s.grantor,
                s.grantee,
                s.grantor_entity_id,
                s.grantee_entity_id,
                s.qualified_sale,
                s.sales_validity,
                s.is_valid,

                p.county,
                p.address,
                p.zip_code,
                p.property_type,
                p.parcel_class,
                p.square_ft,
                p.acres,
                p.year_built,
                p.neighborhood,
                p.tax_district,

                CASE WHEN p.square_ft > 0 THEN s.sale_price / p.square_ft ELSE NULL END as sale_price_per_sqft,

                ROW_NUMBER() OVER (PARTITION BY s.property_id ORDER BY s.sale_date) as sale_number,
                LAG(s.sale_date) OVER (PARTITION BY s.property_id ORDER BY s.sale_date) as previous_sale_date,
                LAG(s.sale_price) OVER (PARTITION BY s.property_id ORDER BY s.sale_date) as previous_sale_price,

                buyer.normalized_name as buyer_normalized_name,
                buyer.entity_type as buyer_entity_type,
                seller.normalized_name as seller_normalized_name,
                seller.entity_type as seller_entity_type

            FROM sales_transactions s
            INNER JOIN properties p ON s.property_id = p.property_id
            LEFT JOIN entities buyer ON s.grantee_entity_id = buyer.entity_id
            LEFT JOIN entities seller ON s.grantor_entity_id = seller.entity_id
            WHERE s.is_valid = true
        )
        SELECT
            *,
            CASE
                WHEN previous_sale_date IS NOT NULL
                THEN DATEDIFF('day', previous_sale_date, sale_date)
                ELSE NULL
            END as days_since_previous_sale,

            CASE
                WHEN previous_sale_price IS NOT NULL AND previous_sale_price > 0
                THEN sale_price - previous_sale_price
                ELSE NULL
            END as profit_vs_previous,

            CASE
                WHEN previous_sale_price IS NOT NULL AND previous_sale_price > 0
                THEN ((sale_price - previous_sale_price) / previous_sale_price) * 100
                ELSE NULL
            END as roi_vs_previous

        FROM sales_with_context
        ORDER BY property_id, sale_date
    """).df()

    logger.info(f"Created property_sales_history: {len(result):,} rows")
    return result


def write_gold_tables(tables: dict, local: bool = False, output_path: str = None):
    """Write gold tables to parquet."""
    logger.info("Writing gold tables...")

    if local:
        base_path = Path(output_path) if output_path else Path(__file__).parent.parent / "data" / "gold"
        base_path.mkdir(parents=True, exist_ok=True)
        for name, df in tables.items():
            path = base_path / f"{name}.parquet"
            df.to_parquet(path, index=False, engine='pyarrow')
            logger.info(f"✅ {name}: {len(df):,} rows → {path}")
    else:
        s3_client = S3Client(Config.S3_BUCKET_NAME)
        for name, df in tables.items():
            temp_file = f"/tmp/{name}.parquet"
            df.to_parquet(temp_file, index=False, engine='pyarrow')
            s3_key = f"gold/{name}.parquet"
            s3_client.s3.upload_file(temp_file, Config.S3_BUCKET_NAME, s3_key)
            logger.info(f"✅ {name}: {len(df):,} rows → s3://{Config.S3_BUCKET_NAME}/{s3_key}")
            Path(temp_file).unlink()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Transform silver to gold layer')
    parser.add_argument('--local', action='store_true', help='Use local files instead of S3')
    parser.add_argument('--silver-path', type=str, help='Override silver data path')
    parser.add_argument('--output-path', type=str, help='Override gold output path')
    args = parser.parse_args()

    try:
        logger.info("=" * 60)
        logger.info("Silver → Gold Transformation")
        logger.info("=" * 60)

        silver_tables = load_silver_tables(local=args.local, silver_path=args.silver_path)

        conn = duckdb.connect()
        conn.register('properties', silver_tables['properties'])
        conn.register('sales_transactions', silver_tables['sales'])
        conn.register('entities', silver_tables['entities'])

        property_sales_history = create_property_sales_history(conn)
        conn.close()

        write_gold_tables(
            {'property_sales_history': property_sales_history},
            local=args.local,
            output_path=args.output_path
        )

        logger.info("=" * 60)
        logger.info(f"✅ Done: property_sales_history {len(property_sales_history):,} rows")
        logger.info("=" * 60)
        return 0

    except Exception as e:
        logger.error(f"Transformation failed: {str(e)}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
