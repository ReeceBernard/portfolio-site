"""Manual scraping script for local development."""

import argparse
import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.qpublic_scraper import QPublicScraper
from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    """Run manual scrape."""
    parser = argparse.ArgumentParser(description='Scrape county property sales data')
    parser.add_argument(
        '--county',
        required=True,
        choices=['fulton', 'dekalb', 'cobb', 'gwinnett'],
        help='County to scrape (fulton, dekalb, cobb, or gwinnett)'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=14,
        help='Number of days to look back (default: 14)'
    )
    parser.add_argument(
        '--local',
        action='store_true',
        help='Save to local file instead of S3'
    )

    args = parser.parse_args()

    logger.info(f"Starting scrape: {args.county} county, {args.days} days")

    try:
        # Initialize scraper
        scraper = QPublicScraper(args.county)

        # Scrape data
        with scraper:
            data = scraper.scrape_recent_sales(days=args.days)

        logger.info(f"Scraped {len(data)} records")

        if len(data) == 0:
            logger.warning("No data scraped. Exiting.")
            return

        # Save data
        if args.local:
            # Save to local file
            filename = f"{args.county}_sales_{datetime.now().strftime('%Y%m%d')}.json"
            filepath = Path(__file__).parent.parent / "data" / filename

            # Create data directory if it doesn't exist
            filepath.parent.mkdir(exist_ok=True)

            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)

            logger.info(f"Data written to: {filepath}")

        else:
            # Write to S3
            s3_client = S3Client(Config.S3_BUCKET_NAME)
            s3_path = s3_client.write_bronze('property_sales', args.county, data)

            logger.info(f"Data written to: {s3_path}")

    except Exception as e:
        logger.error(f"Scrape failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
