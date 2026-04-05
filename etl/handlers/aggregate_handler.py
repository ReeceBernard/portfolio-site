"""Lambda handler for silver to gold aggregation."""

import json
from typing import Dict, Any
from ..scripts.transform_silver_to_gold import load_silver_tables, create_property_sales_history, write_gold_tables
from ..utils.config import Config
from ..utils.logger import setup_logger
import duckdb

logger = setup_logger(__name__)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda entry point for silver → gold aggregation.

    Produces: property_sales_history.parquet
    """
    logger.info("Starting silver to gold aggregation")

    try:
        silver_tables = load_silver_tables(local=False)

        conn = duckdb.connect()
        conn.register('properties', silver_tables['properties'])
        conn.register('sales_transactions', silver_tables['sales'])
        conn.register('entities', silver_tables['entities'])

        property_sales_history = create_property_sales_history(conn)
        conn.close()

        write_gold_tables({'property_sales_history': property_sales_history}, local=False)

        logger.info(f"Aggregation complete: {len(property_sales_history):,} rows")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Aggregation complete',
                'rows': len(property_sales_history)
            })
        }

    except Exception as e:
        logger.error(f"Aggregation failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
