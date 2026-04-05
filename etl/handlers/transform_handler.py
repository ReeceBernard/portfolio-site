"""Lambda handler for bronze to silver transformation."""

import json
from typing import Dict, Any
from ..scripts.transform_bronze_to_silver import load_bronze_data, transform_to_silver, write_silver_tables
from ..utils.config import Config
from ..utils.logger import setup_logger

logger = setup_logger(__name__)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda entry point for bronze → silver transformation.

    Event parameters:
        - county: County name (required)
        - date: Date string YYYY-MM-DD (required)
    """
    county = event.get('county')
    date = event.get('date')

    if not county or not date:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'county and date parameters required'})
        }

    logger.info(f"Transforming {county} data for {date}")

    try:
        bronze_data = load_bronze_data(county=county, date=date, local=False)
        silver_tables = transform_to_silver(bronze_data)
        write_silver_tables(silver_tables, local=False)

        total_records = sum(len(df) for df in silver_tables.values())
        logger.info(f"Transformed {total_records} records for {county} / {date}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully transformed {county} data for {date}',
                'records': total_records
            })
        }

    except Exception as e:
        logger.error(f"Transformation failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
