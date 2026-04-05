"""Scrape all counties with proper rate limiting."""

import sys
import time
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

# All supported counties
COUNTIES = ['fulton', 'gwinnett', 'cobb', 'dekalb']

# Delay between counties (in seconds) to avoid detection
COUNTY_DELAY = 30  # 30 seconds between counties


def scrape_all_counties(days: int = 14, local: bool = False):
    """
    Scrape all counties with proper delays.

    Args:
        days: Number of days to look back
        local: Save to local files instead of S3
    """
    logger.info(f"Starting scrape for all {len(COUNTIES)} counties")
    logger.info(f"Looking back {days} days")
    logger.info(f"Rate limiting: 1.5s between requests, {COUNTY_DELAY}s between counties")

    results = {}
    s3_client = None if local else S3Client(Config.S3_BUCKET_NAME)

    for i, county in enumerate(COUNTIES, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"[{i}/{len(COUNTIES)}] Processing {county.upper()} County")
        logger.info(f"{'='*60}")

        try:
            # Initialize scraper for this county
            scraper = QPublicScraper(county, rate_limit_seconds=1.5)

            # Scrape data
            with scraper:
                data = scraper.scrape_recent_sales(days=days)

            if len(data) == 0:
                logger.warning(f"{county}: No data scraped")
                results[county] = {"status": "no_data", "count": 0}
                continue

            logger.info(f"{county}: Scraped {len(data)} records")

            # Save data
            if local:
                # Save to local file
                filename = f"{county}_sales_{datetime.now().strftime('%Y%m%d')}.json"
                filepath = Path(__file__).parent.parent / "data" / filename

                # Create data directory if it doesn't exist
                filepath.parent.mkdir(exist_ok=True)

                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)

                logger.info(f"{county}: Written to {filepath}")
                results[county] = {
                    "status": "success",
                    "count": len(data),
                    "path": str(filepath)
                }

            else:
                # Write to S3
                s3_path = s3_client.write_bronze('property_sales', county, data)
                logger.info(f"{county}: Written to {s3_path}")
                results[county] = {
                    "status": "success",
                    "count": len(data),
                    "path": s3_path
                }

        except Exception as e:
            logger.error(f"{county}: Failed - {str(e)}", exc_info=True)
            results[county] = {
                "status": "error",
                "error": str(e)
            }

        # Add delay between counties (except after the last one)
        if i < len(COUNTIES):
            logger.info(f"\n⏳ Waiting {COUNTY_DELAY} seconds before next county...")
            time.sleep(COUNTY_DELAY)

    # Print summary
    logger.info(f"\n{'='*60}")
    logger.info("SUMMARY")
    logger.info(f"{'='*60}")

    total_records = 0
    successful = 0
    failed = 0

    for county, result in results.items():
        status_emoji = "✅" if result["status"] == "success" else "❌"
        logger.info(f"{status_emoji} {county.upper()}: {result}")

        if result["status"] == "success":
            successful += 1
            total_records += result["count"]
        else:
            failed += 1

    logger.info(f"\nTotal records: {total_records}")
    logger.info(f"Successful: {successful}/{len(COUNTIES)}")
    logger.info(f"Failed: {failed}/{len(COUNTIES)}")

    return results


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Scrape all counties')
    parser.add_argument(
        '--days',
        type=int,
        default=14,
        help='Number of days to look back (default: 14)'
    )
    parser.add_argument(
        '--local',
        action='store_true',
        help='Save to local files instead of S3'
    )

    args = parser.parse_args()

    try:
        results = scrape_all_counties(days=args.days, local=args.local)

        # Exit with error code if any scrapes failed
        failed_count = sum(1 for r in results.values() if r["status"] != "success")
        if failed_count > 0:
            sys.exit(1)

    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Scraping interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)
