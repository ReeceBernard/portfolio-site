"""
HomeHarvest incremental / monthly scrape — all 159 GA counties.

Stateless (no checkpoint). Scrapes sold listings for the past N days and
overwrites the existing S3 file at the same date key. Suitable for running
on a schedule (e.g. monthly cron).

Examples:
    python scripts/homeharvest_monthly.py --days 30
    python scripts/homeharvest_monthly.py --days 14 --workers 4
    python scripts/homeharvest_monthly.py --days 7 --site zillow
"""

import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.homeharvest_scraper import GA_COUNTIES, SITE_NAME, scrape_county_to_bronze
from utils.config import Config
from utils.logger import setup_logger
from utils.s3_client import S3Client

logger = setup_logger(__name__)

MAX_WORKERS_CAP = 4


# ---------------------------------------------------------------------------
# Worker (same contract as backfill worker, no checkpoint needed)
# ---------------------------------------------------------------------------

def _worker(
    county: str,
    date_from: str,
    date_to: str,
    s3_client: S3Client,
    site_name: str,
) -> Dict:
    """Run scrape for a single county. Returns status dict."""
    time.sleep(random.uniform(3.0, 7.0))  # per-worker jitter before request
    try:
        records, raw_count = scrape_county_to_bronze(county, date_from, date_to, site_name)
        s3_path = None
        if records:
            # Overwrites existing file at same date key for idempotent reruns
            s3_path = s3_client.write_bronze(
                "property_sales_hh", county, records, date=date_to
            )
        return {
            "status": "success",
            "county": county,
            "record_count": len(records),
            "raw_count": raw_count,
            "s3_path": s3_path,
        }
    except Exception as e:
        return {"status": "error", "county": county, "error": str(e)}


# ---------------------------------------------------------------------------
# Progress logging
# ---------------------------------------------------------------------------

def _log_progress(result: Dict, done: int, total: int, run_start: float) -> None:
    elapsed = int(time.time() - run_start)
    remaining = total - done
    eta = int(elapsed / done * remaining) if done > 0 else 0
    county = result["county"]
    if result["status"] == "success":
        rc = result.get("record_count", 0)
        logger.info(
            f"[{done}/{total}] {county} | elapsed={elapsed}s | ETA={eta}s | records={rc}"
        )
    else:
        logger.error(
            f"[{done}/{total}] {county} FAILED | elapsed={elapsed}s | ETA={eta}s"
            f" | error={result.get('error')}"
        )


# ---------------------------------------------------------------------------
# Main scrape logic
# ---------------------------------------------------------------------------

def monthly_scrape(
    days: int = 30,
    workers: int = 1,
    site_name: str = SITE_NAME,
    county_filter: Optional[str] = None,
) -> int:
    """
    Scrape the past N days for all 159 GA counties (or a single county).

    Args:
        county_filter: If set, only scrape this one county (for testing).

    Returns:
        0 on success, 1 if any counties failed.
    """
    date_to = datetime.now().strftime("%Y-%m-%d")
    date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    workers = min(workers, MAX_WORKERS_CAP)

    counties = [county_filter] if county_filter else GA_COUNTIES

    logger.info("=" * 60)
    logger.info("HomeHarvest Monthly Scrape")
    logger.info("=" * 60)
    logger.info(f"Date range : {date_from} → {date_to}  ({days} days)")
    logger.info(f"Counties   : {len(counties)}{' (test mode)' if county_filter else ''}")
    logger.info(f"Workers    : {workers}")
    logger.info(f"Site       : {site_name}\n")

    s3_client = S3Client(Config.S3_BUCKET_NAME)
    run_start = time.time()

    results: List[Dict] = []
    total = len(counties)
    done_count = 0

    try:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(_worker, c, date_from, date_to, s3_client, site_name): c
                for c in counties
            }

            for future in as_completed(futures):
                result = future.result()
                done_count += 1
                results.append(result)
                _log_progress(result, done_count, total, run_start)

    except KeyboardInterrupt:
        logger.warning("\nScrape interrupted.")
        return 130

    # Final summary
    total_runtime = int(time.time() - run_start)
    successful = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "error"]

    total_records = sum(r.get("record_count", 0) for r in successful)
    top_counties = sorted(successful, key=lambda x: x.get("record_count", 0), reverse=True)

    logger.info("\n" + "=" * 60)
    logger.info("MONTHLY SCRAPE COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Total runtime   : {total_runtime}s")
    logger.info(f"Counties done   : {len(successful)}/{total}")
    logger.info(f"Total records   : {total_records:,}")

    if failed:
        logger.warning(f"Failed ({len(failed)}): {', '.join(r['county'] for r in failed)}")

    logger.info("\nTop 10 counties by record count:")
    for r in top_counties[:10]:
        logger.info(f"  {r['county']:<20} {r.get('record_count', 0):>7,}")

    return 1 if failed else 0


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="HomeHarvest incremental scrape for all 159 GA counties",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/homeharvest_monthly.py --days 30
  python scripts/homeharvest_monthly.py --days 14 --workers 4
  python scripts/homeharvest_monthly.py --days 7 --site zillow
        """,
    )
    parser.add_argument("--days", type=int, default=30,
                        help="Days to look back (default: 30)")
    parser.add_argument(
        "--workers", type=int, default=1,
        help=f"Parallel workers (default 1, max {MAX_WORKERS_CAP})"
    )
    parser.add_argument("--site", type=str, default=SITE_NAME,
                        help="HomeHarvest source site (default: redfin)")
    parser.add_argument("--county", type=str, default=None,
                        help="Scrape a single county only (for testing)")

    args = parser.parse_args()

    try:
        exit_code = monthly_scrape(
            days=args.days,
            workers=args.workers,
            site_name=args.site,
            county_filter=args.county,
        )
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
