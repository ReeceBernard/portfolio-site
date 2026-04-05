"""
Incremental scraper that fills gaps from today back to last checkpoint.

Runs one day at a time instead of 14-day windows.
Automatically detects the last scraped date and fills forward.

IMPORTANT: Uses a "stability window" to account for qPublic publication lag.
Recent dates (last 60 days by default) are NOT checkpointed, so they'll be
re-scraped on the next run. This catches late-arriving sales data.

Example:
    # Scrape from today back to last checkpoint
    python scripts/incremental_scrape.py

    # Scrape locally (for testing)
    python scripts/incremental_scrape.py --local

    # Force rescrape from specific date
    python scripts/incremental_scrape.py --from 2026-01-15

    # Use 60-day stability window
    python scripts/incremental_scrape.py --stable-days 60
"""

import sys
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.qpublic_scraper import QPublicScraper
from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Constants
COUNTIES = ['fulton', 'gwinnett', 'cobb', 'dekalb']
COUNTY_DELAY = 30  # seconds between counties
DAY_DELAY = 10      # seconds between days
CHECKPOINT_FILE = Path(__file__).parent.parent / "data" / "incremental_checkpoint.json"


class IncrementalProgress:
    """Manages incremental scraping progress and checkpointing."""

    def __init__(self, checkpoint_file: Path):
        self.checkpoint_file = checkpoint_file
        self.progress = self._load_checkpoint()

    def _load_checkpoint(self) -> Dict:
        """Load checkpoint from file."""
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file, 'r') as f:
                return json.load(f)
        return {
            'last_scraped_date': None,  # YYYY-MM-DD
            'completed_dates': [],
            'failed_dates': [],
            'last_updated': None
        }

    def save_checkpoint(self):
        """Save checkpoint to file."""
        self.checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
        self.progress['last_updated'] = datetime.now().isoformat()

        with open(self.checkpoint_file, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def mark_date_complete(self, date: str, counties_data: Dict, stable: bool = True):
        """
        Mark a date as completed.

        Args:
            date: Date string (YYYY-MM-DD)
            counties_data: Scrape results by county
            stable: If True, mark as permanently complete. If False, allow re-scraping.
        """
        if stable:
            # Permanently checkpoint this date
            self.progress['completed_dates'].append({
                'date': date,
                'timestamp': datetime.now().isoformat(),
                'counties': counties_data
            })

            # Update last scraped date
            if not self.progress['last_scraped_date'] or date > self.progress['last_scraped_date']:
                self.progress['last_scraped_date'] = date

        # Always save checkpoint (even for non-stable dates, for tracking)
        self.save_checkpoint()

    def mark_date_failed(self, date: str, error: str):
        """Mark a date as failed."""
        self.progress['failed_dates'].append({
            'date': date,
            'timestamp': datetime.now().isoformat(),
            'error': error
        })
        self.save_checkpoint()

    def is_date_completed(self, date: str) -> bool:
        """Check if date was already completed."""
        return any(d['date'] == date for d in self.progress['completed_dates'])

    def get_last_scraped_date(self) -> Optional[datetime]:
        """Get the most recent successfully scraped date."""
        if self.progress['last_scraped_date']:
            return datetime.strptime(self.progress['last_scraped_date'], '%Y-%m-%d')
        return None


def detect_last_scraped_date_from_s3(s3_client: S3Client) -> Optional[datetime]:
    """
    Detect the most recent scraped date by checking S3 bronze files.

    Args:
        s3_client: S3 client

    Returns:
        Most recent date found, or None
    """
    try:
        # List all bronze files for property_sales
        prefix = "bronze/property_sales/"
        response = s3_client.s3.list_objects_v2(
            Bucket=s3_client.bucket_name,
            Prefix=prefix
        )

        if 'Contents' not in response:
            logger.info("No bronze files found in S3")
            return None

        # Extract dates from file keys (format: bronze/property_sales/county/YYYY-MM-DD.json)
        dates = set()
        for obj in response['Contents']:
            key = obj['Key']
            # Extract YYYY-MM-DD from path
            parts = key.split('/')
            if len(parts) >= 4:
                filename = parts[-1]  # YYYY-MM-DD.json
                date_str = filename.replace('.json', '')
                try:
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    dates.add(date)
                except ValueError:
                    continue

        if not dates:
            logger.info("No valid dates found in S3 bronze files")
            return None

        most_recent = max(dates)
        logger.info(f"Most recent date in S3: {most_recent.strftime('%Y-%m-%d')}")
        return most_recent

    except Exception as e:
        logger.error(f"Failed to detect last scraped date from S3: {e}")
        return None


def detect_last_scraped_date_from_local() -> Optional[datetime]:
    """
    Detect the most recent scraped date by checking local files.

    Returns:
        Most recent date found, or None
    """
    try:
        data_path = Path(__file__).parent.parent / "data" / "backfill"

        if not data_path.exists():
            logger.info("No local backfill directory found")
            return None

        # Look for JSON files with dates in the filename
        json_files = list(data_path.glob("*.json"))

        if not json_files:
            logger.info("No local JSON files found")
            return None

        dates = set()
        for file in json_files:
            # Extract date from filename (format: county_sales_YYYYMMDD_YYYYMMDD.json)
            try:
                parts = file.stem.split('_')
                # Get the end date (last YYYYMMDD)
                end_date_str = parts[-1]
                date = datetime.strptime(end_date_str, '%Y%m%d')
                dates.add(date)
            except (ValueError, IndexError):
                continue

        if not dates:
            logger.info("No valid dates found in local files")
            return None

        most_recent = max(dates)
        logger.info(f"Most recent date in local files: {most_recent.strftime('%Y-%m-%d')}")
        return most_recent

    except Exception as e:
        logger.error(f"Failed to detect last scraped date from local files: {e}")
        return None


def scrape_single_day(
    scrape_date: datetime,
    s3_client: Optional[S3Client] = None,
    local: bool = False
) -> Dict:
    """
    Scrape all counties for a single day.

    Args:
        scrape_date: Date to scrape
        s3_client: S3 client (if saving to S3)
        local: Save to local files instead

    Returns:
        Dict of results by county
    """
    date_str = scrape_date.strftime('%Y-%m-%d')
    logger.info(f"\n{'='*60}")
    logger.info(f"Date: {date_str}")
    logger.info(f"{'='*60}")

    results = {}

    for i, county in enumerate(COUNTIES, 1):
        logger.info(f"[{i}/{len(COUNTIES)}] {county.upper()}")

        try:
            # Scrape county for this specific day
            scraper = QPublicScraper(county, rate_limit_seconds=1.5)

            with scraper:
                # Scrape exact day (same start and end date)
                data = scraper.scrape_sales_by_date_range(scrape_date, scrape_date)

            if len(data) == 0:
                logger.info(f"{county}: No sales on this date")
                results[county] = {'status': 'no_data', 'count': 0}
                continue

            logger.info(f"{county}: Found {len(data)} sales")

            # Save data
            if local:
                filename = f"{county}_sales_{scrape_date.strftime('%Y%m%d')}.json"
                filepath = Path(__file__).parent.parent / "data" / "backfill" / filename
                filepath.parent.mkdir(parents=True, exist_ok=True)

                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)

                results[county] = {
                    'status': 'success',
                    'count': len(data),
                    'path': str(filepath)
                }
            else:
                # Save to S3
                s3_path = s3_client.write_bronze('property_sales', county, data, date=date_str)
                results[county] = {
                    'status': 'success',
                    'count': len(data),
                    'path': s3_path
                }

        except Exception as e:
            logger.error(f"{county}: Failed - {str(e)}")
            results[county] = {
                'status': 'error',
                'error': str(e)
            }

        # Delay between counties (except last one)
        if i < len(COUNTIES):
            logger.info(f"⏳ Waiting {COUNTY_DELAY}s...")
            time.sleep(COUNTY_DELAY)

    return results


def incremental_scrape(
    local: bool = False,
    from_date: Optional[str] = None,
    max_days: int = 365,
    stable_days: int = 60
):
    """
    Run incremental scraping from today back to last checkpoint.

    Args:
        local: Save to local files instead of S3
        from_date: Force start from specific date (YYYY-MM-DD)
        max_days: Maximum number of days to scrape (safety limit)
        stable_days: Only checkpoint dates older than this (to account for publication lag)
    """
    logger.info("="*60)
    logger.info("Incremental Scraper")
    logger.info("="*60)

    # Initialize progress tracking
    progress = IncrementalProgress(CHECKPOINT_FILE)

    # Determine start date (most recent date we need to scrape)
    today = datetime.now()

    # Determine end date (last checkpoint)
    if from_date:
        # User forced a specific date
        last_checkpoint = datetime.strptime(from_date, '%Y-%m-%d')
        logger.info(f"Using forced start date: {last_checkpoint.strftime('%Y-%m-%d')}")
    else:
        # Try to detect from checkpoint file first
        last_checkpoint = progress.get_last_scraped_date()

        if not last_checkpoint:
            # Try to detect from S3/local
            if local:
                last_checkpoint = detect_last_scraped_date_from_local()
            else:
                s3_client = S3Client(Config.S3_BUCKET_NAME)
                last_checkpoint = detect_last_scraped_date_from_s3(s3_client)

        if not last_checkpoint:
            # No checkpoint found, default to yesterday
            last_checkpoint = today - timedelta(days=1)
            logger.info(f"No checkpoint found, starting from yesterday: {last_checkpoint.strftime('%Y-%m-%d')}")
        else:
            logger.info(f"Last checkpoint: {last_checkpoint.strftime('%Y-%m-%d')}")

    # Generate list of dates to scrape (from today backwards to checkpoint)
    dates_to_scrape = []
    current_date = today

    while current_date > last_checkpoint and len(dates_to_scrape) < max_days:
        date_str = current_date.strftime('%Y-%m-%d')

        # Skip if already completed
        if not progress.is_date_completed(date_str):
            dates_to_scrape.append(current_date)

        current_date -= timedelta(days=1)

    if not dates_to_scrape:
        logger.info("\n✅ No new dates to scrape. All caught up!")
        return 0

    logger.info(f"\nPlan:")
    logger.info(f"  Dates to scrape: {len(dates_to_scrape)}")
    logger.info(f"  Range: {dates_to_scrape[-1].strftime('%Y-%m-%d')} to {dates_to_scrape[0].strftime('%Y-%m-%d')}")
    logger.info(f"  Total scrapes: {len(dates_to_scrape) * len(COUNTIES)}")
    logger.info(f"  Estimated time: {(len(dates_to_scrape) * (len(COUNTIES) * 10 + DAY_DELAY)) / 60:.1f} minutes")
    logger.info(f"  Storage: {'Local files' if local else 'S3'}")
    logger.info(f"  Stability window: {stable_days} days (recent dates will be re-scraped)")

    # Initialize S3 client if needed
    s3_client = None if local else S3Client(Config.S3_BUCKET_NAME)

    # Calculate stable cutoff date (dates older than this get permanently checkpointed)
    stable_cutoff = today - timedelta(days=stable_days)
    logger.info(f"  Stable cutoff: {stable_cutoff.strftime('%Y-%m-%d')} (dates before this will be checkpointed)")

    # Process dates (newest first)
    successful = 0
    failed = 0
    unstable_count = 0

    try:
        for idx, scrape_date in enumerate(dates_to_scrape, 1):
            date_str = scrape_date.strftime('%Y-%m-%d')

            # Determine if this date is stable (old enough to checkpoint permanently)
            is_stable = scrape_date < stable_cutoff

            logger.info(f"\n[{idx}/{len(dates_to_scrape)}] Processing {date_str} {'(stable)' if is_stable else '(unstable - will re-scrape)'}")

            try:
                # Scrape this day
                results = scrape_single_day(scrape_date, s3_client, local)

                # Check for errors
                failed_counties = [c for c, r in results.items() if r['status'] == 'error']

                if failed_counties:
                    error_msg = f"Failed counties: {', '.join(failed_counties)}"
                    logger.warning(f"Date {date_str}: {error_msg}")
                    progress.mark_date_failed(date_str, error_msg)
                    failed += 1
                else:
                    # Mark complete, but only checkpoint permanently if stable
                    progress.mark_date_complete(date_str, results, stable=is_stable)

                    if is_stable:
                        logger.info(f"✅ Date {date_str} complete (checkpointed)")
                    else:
                        logger.info(f"✅ Date {date_str} complete (will re-scrape on next run)")
                        unstable_count += 1

                    successful += 1

            except Exception as e:
                logger.error(f"Date {date_str} failed: {str(e)}")
                progress.mark_date_failed(date_str, str(e))
                failed += 1

            # Delay between days (except last one)
            if idx < len(dates_to_scrape):
                logger.info(f"\n⏳ Waiting {DAY_DELAY}s before next day...")
                time.sleep(DAY_DELAY)

        # Final summary
        logger.info(f"\n{'='*60}")
        logger.info(f"INCREMENTAL SCRAPE COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"Successful: {successful}/{len(dates_to_scrape)}")
        logger.info(f"Failed: {failed}/{len(dates_to_scrape)}")
        logger.info(f"Checkpointed (stable): {successful - unstable_count}")
        logger.info(f"Unstable (will re-scrape): {unstable_count}")

        if progress.get_last_scraped_date():
            logger.info(f"Last stable date: {progress.get_last_scraped_date().strftime('%Y-%m-%d')}")
        else:
            logger.info(f"Last stable date: None (all dates are unstable)")

        return 0 if failed == 0 else 1

    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Scraping interrupted by user")
        logger.info(f"Progress saved to: {CHECKPOINT_FILE}")
        logger.info(f"Resume with: python scripts/incremental_scrape.py")
        return 130


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='Incremental scraper - fills gaps from today to last checkpoint',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape from today back to last checkpoint (S3)
  python scripts/incremental_scrape.py

  # Test locally
  python scripts/incremental_scrape.py --local

  # Force scrape from specific date
  python scripts/incremental_scrape.py --from 2026-01-15

  # Use 60-day stability window (re-scrape last 60 days on each run)
  python scripts/incremental_scrape.py --stable-days 60
        """
    )

    parser.add_argument('--local', action='store_true', help='Save to local files instead of S3')
    parser.add_argument('--from', dest='from_date', type=str, help='Force start from specific date (YYYY-MM-DD)')
    parser.add_argument('--max-days', type=int, default=365, help='Maximum days to scrape (safety limit)')
    parser.add_argument('--stable-days', type=int, default=60, help='Only checkpoint dates older than this many days (default: 60)')

    args = parser.parse_args()

    try:
        exit_code = incremental_scrape(
            local=args.local,
            from_date=args.from_date,
            max_days=args.max_days,
            stable_days=args.stable_days
        )
        sys.exit(exit_code)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)
