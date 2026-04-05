"""Lambda handler for scraping county data."""

import json
from typing import Dict, Any
from ..bronze.scrapers.qpublic_scraper import QPublicScraper
from ..utils.s3_client import S3Client
from ..utils.config import Config
from ..utils.logger import setup_logger

logger = setup_logger(__name__)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda entry point for scraping.

    Event parameters:
        - county: County name (required) — fulton, dekalb, cobb, gwinnett
        - days: Number of days to look back (default: 14)
    """
    county = event.get('county')
    days = event.get('days', 14)

    if not county:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'county parameter required'})
        }

    county = county.lower()

    if county not in Config.COUNTIES:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Unsupported county: {county}'})
        }

    logger.info(f"Scraping {county} county, {days} days back")

    try:
        scraper = QPublicScraper(county)

        with scraper:
            data = scraper.scrape_recent_sales(days=days)

        s3_client = S3Client(Config.S3_BUCKET_NAME)
        s3_path = s3_client.write_bronze(county, data)

        logger.info(f"Scraped {len(data)} records to {s3_path}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully scraped {county}',
                'records': len(data),
                's3_path': s3_path
            })
        }

    except Exception as e:
        logger.error(f"Scraping failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
