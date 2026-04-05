"""
Backfill historical sales data for all counties.

This script scrapes historical data one day at a time, working backwards from today.
It includes checkpointing so you can stop/resume the process.

Note: Uses 1-day windows to avoid hitting qPublic's 500-record limit per query.

Example:
    # Backfill last 7 years
    python scripts/backfill.py --years 7

    # Resume from checkpoint
    python scripts/backfill.py --years 7 --resume

    # Test with 30 days locally
    python scripts/backfill.py --days 30 --local
"""

import sys
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.qpublic_scraper import QPublicScraper
from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Constants
COUNTIES = ['fulton', 'gwinnett', 'cobb', 'dekalb']
DAYS_PER_WINDOW = 1  # 1-day windows to avoid 500-record limit
COUNTY_DELAY = 30  # seconds between counties
WINDOW_DELAY = 10   # seconds between date windows (reduced since windows are smaller)
CHECKPOINT_FILE = Path(__file__).parent.parent / "data" / "backfill_checkpoint.json"


class BackfillProgress:
    """Manages backfill progress and checkpointing."""

    def __init__(self, checkpoint_file: Path):
        self.checkpoint_file = checkpoint_file
        self.progress = self._load_checkpoint()

    def _load_checkpoint(self) -> Dict:
        """Load checkpoint from file."""
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file, 'r') as f:
                return json.load(f)
        return {
            'completed_windows': [],
            'failed_windows': [],
            'last_successful_window': None,
            'started_at': None,
            'last_updated': None
        }

    def save_checkpoint(self):
        """Save checkpoint to file."""
        self.checkpoint_file.parent.mkdir(exist_ok=True)
        self.progress['last_updated'] = datetime.now().isoformat()

        with open(self.checkpoint_file, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def mark_window_complete(self, window_id: str, counties_data: Dict):
        """Mark a window as completed."""
        self.progress['completed_windows'].append({
            'window_id': window_id,
            'timestamp': datetime.now().isoformat(),
            'counties': counties_data
        })
        self.progress['last_successful_window'] = window_id
        self.save_checkpoint()

    def mark_window_failed(self, window_id: str, error: str):
        """Mark a window as failed."""
        self.progress['failed_windows'].append({
            'window_id': window_id,
            'timestamp': datetime.now().isoformat(),
            'error': error
        })
        self.save_checkpoint()

    def is_window_completed(self, window_id: str) -> bool:
        """Check if window was already completed."""
        return any(w['window_id'] == window_id for w in self.progress['completed_windows'])

    def get_stats(self) -> Dict:
        """Get progress statistics."""
        return {
            'completed': len(self.progress['completed_windows']),
            'failed': len(self.progress['failed_windows']),
            'total_records': sum(
                sum(county['count'] for county in w['counties'].values() if county.get('count'))
                for w in self.progress['completed_windows']
            )
        }


def generate_date_windows(start_date: datetime, end_date: datetime, days_per_window: int) -> List[tuple]:
    """
    Generate list of (start, end) date tuples for scraping.

    Args:
        start_date: Earliest date to scrape
        end_date: Latest date to scrape
        days_per_window: Days per scraping window

    Returns:
        List of (window_start, window_end) tuples, newest first
    """
    windows = []
    current_end = end_date

    while current_end > start_date:
        current_start = max(current_end - timedelta(days=days_per_window), start_date)
        windows.append((current_start, current_end))
        current_end = current_start

    return windows


def scrape_window(
    window_start: datetime,
    window_end: datetime,
    s3_client: Optional[S3Client] = None,
    local: bool = False
) -> Dict:
    """
    Scrape all counties for a specific date window.

    Args:
        window_start: Start date for window
        window_end: End date for window
        s3_client: S3 client (if saving to S3)
        local: Save to local files instead

    Returns:
        Dict of results by county
    """
    window_id = f"{window_start.strftime('%Y%m%d')}_{window_end.strftime('%Y%m%d')}"
    logger.info(f"\n{'='*60}")
    logger.info(f"Date: {window_start.strftime('%Y-%m-%d')}")
    logger.info(f"{'='*60}")

    results = {}

    for i, county in enumerate(COUNTIES, 1):
        logger.info(f"[{i}/{len(COUNTIES)}] {county.upper()}")

        try:
            # Scrape county
            scraper = QPublicScraper(county, rate_limit_seconds=1.5)

            with scraper:
                data = scraper.scrape_sales_by_date_range(window_start, window_end)

            if len(data) == 0:
                logger.warning(f"{county}: No data found")
                results[county] = {'status': 'no_data', 'count': 0}
                continue

            logger.info(f"{county}: Found {len(data)} records")

            # Save data
            if local:
                filename = f"{county}_sales_{window_id}.json"
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
                # Save to S3 with date-specific key
                s3_path = s3_client.write_bronze('property_sales', county, data, date=window_end.strftime('%Y-%m-%d'))
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


def backfill(
    years: Optional[int] = None,
    days: Optional[int] = None,
    local: bool = False,
    resume: bool = False,
    start_from: Optional[str] = None
):
    """
    Backfill historical sales data.

    Args:
        years: Number of years to backfill
        days: Number of days to backfill (alternative to years)
        local: Save to local files instead of S3
        resume: Resume from checkpoint
        start_from: Start from specific date (YYYY-MM-DD)
    """
    # Calculate date range
    end_date = datetime.now()

    if start_from:
        start_date = datetime.strptime(start_from, '%Y-%m-%d')
    elif years:
        start_date = end_date - timedelta(days=years * 365)
    elif days:
        start_date = end_date - timedelta(days=days)
    else:
        raise ValueError("Must specify --years, --days, or --start-from")

    # Generate windows
    windows = generate_date_windows(start_date, end_date, DAYS_PER_WINDOW)

    logger.info(f"Backfill Plan:")
    logger.info(f"{'='*60}")
    logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    logger.info(f"Total days: {len(windows)}")
    logger.info(f"Total scrapes: {len(windows) * len(COUNTIES)}")
    logger.info(f"Estimated runtime: {(len(windows) * (len(COUNTIES) * 10 + WINDOW_DELAY)) / 3600:.1f} hours")
    logger.info(f"Storage: {'Local files' if local else 'S3'}")
    logger.info(f"Window size: {DAYS_PER_WINDOW} day(s) per scrape")

    # Initialize progress tracking
    progress = BackfillProgress(CHECKPOINT_FILE)

    if resume:
        stats = progress.get_stats()
        logger.info(f"\nResuming from checkpoint:")
        logger.info(f"  Completed: {stats['completed']} windows")
        logger.info(f"  Failed: {stats['failed']} windows")
        logger.info(f"  Records: {stats['total_records']:,}")
    else:
        # Start fresh
        progress.progress['started_at'] = datetime.now().isoformat()
        progress.save_checkpoint()

    # Initialize S3 client if needed
    s3_client = None if local else S3Client(Config.S3_BUCKET_NAME)

    # Process windows
    try:
        for idx, (window_start, window_end) in enumerate(windows, 1):
            window_id = f"{window_start.strftime('%Y%m%d')}_{window_end.strftime('%Y%m%d')}"

            # Skip if already completed
            if resume and progress.is_window_completed(window_id):
                logger.info(f"[{idx}/{len(windows)}] Skipping {window_id} (already completed)")
                continue

            logger.info(f"\n[{idx}/{len(windows)}] Processing {window_id}")

            try:
                # Scrape this window
                results = scrape_window(window_start, window_end, s3_client, local)

                # Check for errors
                failed_counties = [c for c, r in results.items() if r['status'] == 'error']

                if failed_counties:
                    error_msg = f"Failed counties: {', '.join(failed_counties)}"
                    logger.warning(f"Window {window_id}: {error_msg}")
                    progress.mark_window_failed(window_id, error_msg)
                else:
                    progress.mark_window_complete(window_id, results)
                    logger.info(f"✅ Window {window_id} complete")

            except Exception as e:
                logger.error(f"Window {window_id} failed: {str(e)}")
                progress.mark_window_failed(window_id, str(e))

            # Delay between windows (except last one)
            if idx < len(windows):
                logger.info(f"\n⏳ Waiting {WINDOW_DELAY}s before next window...")
                time.sleep(WINDOW_DELAY)

        # Final summary
        stats = progress.get_stats()
        logger.info(f"\n{'='*60}")
        logger.info(f"BACKFILL COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"Completed windows: {stats['completed']}/{len(windows)}")
        logger.info(f"Failed windows: {stats['failed']}")
        logger.info(f"Total records: {stats['total_records']:,}")

        if stats['failed'] > 0:
            logger.warning(f"\n⚠️  {stats['failed']} windows failed. Check logs and retry.")
            return 1

        return 0

    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Backfill interrupted by user")
        logger.info(f"Progress saved to: {CHECKPOINT_FILE}")
        logger.info(f"Resume with: python scripts/backfill.py --resume --years 7")
        return 130


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='Backfill historical sales data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Backfill 7 years to S3
  python scripts/backfill.py --years 7

  # Test 30 days locally
  python scripts/backfill.py --days 30 --local

  # Resume from checkpoint
  python scripts/backfill.py --years 7 --resume

  # Start from specific date
  python scripts/backfill.py --start-from 2020-01-01
        """
    )

    parser.add_argument('--years', type=int, help='Number of years to backfill')
    parser.add_argument('--days', type=int, help='Number of days to backfill')
    parser.add_argument('--start-from', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--local', action='store_true', help='Save to local files instead of S3')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')

    args = parser.parse_args()

    # Validate arguments
    if not args.resume and not any([args.years, args.days, args.start_from]):
        parser.error("Must specify --years, --days, or --start-from (or --resume)")

    try:
        exit_code = backfill(
            years=args.years,
            days=args.days,
            local=args.local,
            resume=args.resume,
            start_from=args.start_from
        )
        sys.exit(exit_code)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)
