"""
HomeHarvest historical backfill — all 159 GA counties.

Scrapes sold listings from Redfin (or another site) for a multi-year date range,
writing one JSON file per county to the HH bronze path on S3. Resumable via
checkpoint file at data/hh_run_state.json.

Examples:
    python scripts/homeharvest_backfill.py --years 5
    python scripts/homeharvest_backfill.py --years 5 --resume
    python scripts/homeharvest_backfill.py --years 5 --workers 4 --site zillow
    python scripts/homeharvest_backfill.py --years 5 --dry-run
"""

import json
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime as dt
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.homeharvest_scraper import GA_COUNTIES, SITE_NAME, scrape_county_to_bronze
from utils.config import Config
from utils.logger import setup_logger
from utils.s3_client import S3Client

logger = setup_logger(__name__)

CHECKPOINT_FILE = Path(__file__).parent.parent / "data" / "hh_run_state.json"
MAX_WORKERS_CAP = 4


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------

def load_checkpoint() -> Dict:
    """Load checkpoint from disk, or return a fresh empty state."""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, "r") as f:
            return json.load(f)
    return {
        "started_at": None,
        "last_updated": None,
        "date_from": None,
        "date_to": None,
        "completed": [],
        "failed": [],
    }


def save_checkpoint(state: Dict) -> None:
    """Persist checkpoint to disk (called under _checkpoint_lock)."""
    CHECKPOINT_FILE.parent.mkdir(exist_ok=True)
    state["last_updated"] = datetime.now(timezone.utc).isoformat()
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump(state, f, indent=2)


def completed_counties(state: Dict) -> set:
    return {entry["county"] for entry in state.get("completed", [])}


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

_checkpoint_lock = threading.Lock()


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
# Main backfill logic
# ---------------------------------------------------------------------------

def backfill(
    years: Optional[int] = None,
    months: Optional[int] = None,
    resume: bool = False,
    workers: int = 1,
    site_name: str = SITE_NAME,
    dry_run: bool = False,
) -> int:
    """
    Backfill all 159 GA counties for the given number of years.

    Returns:
        0 on success, 1 if any counties failed.
    """
    date_to = datetime.now().strftime("%Y-%m-%d")
    if months:
        date_from = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")
    else:
        date_from = (datetime.now() - timedelta(days=years * 365)).strftime("%Y-%m-%d")

    workers = min(workers, MAX_WORKERS_CAP)

    logger.info("=" * 60)
    logger.info("HomeHarvest Backfill Plan")
    logger.info("=" * 60)
    logger.info(f"Date range : {date_from} → {date_to}")
    logger.info(f"Counties   : {len(GA_COUNTIES)}")
    logger.info(f"Workers    : {workers}")
    logger.info(f"Site       : {site_name}")
    logger.info(f"Resume     : {resume}")
    logger.info(f"Dry run    : {dry_run}")

    if dry_run:
        logger.info("\n[DRY RUN] No data will be scraped or written.")
        logger.info(f"Would scrape {len(GA_COUNTIES)} counties from {date_from} to {date_to}")
        return 0

    # Load / initialize checkpoint
    if resume:
        state = load_checkpoint()
        already_done = completed_counties(state)
        logger.info(f"\nResuming from checkpoint ({len(already_done)} counties already done)")
    else:
        state = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_updated": None,
            "date_from": date_from,
            "date_to": date_to,
            "completed": [],
            "failed": [],
        }
        already_done = set()
        save_checkpoint(state)

    counties_todo: List[str] = [c for c in GA_COUNTIES if c not in already_done]
    total = len(GA_COUNTIES)
    done_count = len(already_done)

    logger.info(f"Remaining  : {len(counties_todo)} counties\n")

    s3_client = S3Client(Config.S3_BUCKET_NAME)
    run_start = time.time()

    try:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(_worker, c, date_from, date_to, s3_client, site_name): c
                for c in counties_todo
            }

            for future in as_completed(futures):
                result = future.result()
                done_count += 1

                with _checkpoint_lock:
                    if result["status"] == "success":
                        state["completed"].append({
                            "county": result["county"],
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "record_count": result.get("record_count", 0),
                            "s3_path": result.get("s3_path"),
                        })
                    else:
                        state["failed"].append({
                            "county": result["county"],
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "error": result.get("error", "unknown"),
                        })
                    save_checkpoint(state)

                _log_progress(result, done_count, total, run_start)

    except KeyboardInterrupt:
        logger.warning("\nBackfill interrupted — progress saved to checkpoint.")
        logger.info(f"Resume with: python scripts/homeharvest_backfill.py --years {years} --resume")
        return 130

    # Final summary
    total_runtime = int(time.time() - run_start)
    failed_counties = [e["county"] for e in state["failed"]]
    completed_entries = sorted(state["completed"], key=lambda x: x.get("record_count", 0), reverse=True)

    logger.info("\n" + "=" * 60)
    logger.info("BACKFILL COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Total runtime: {total_runtime}s")
    logger.info(f"Completed: {len(state['completed'])}/{len(GA_COUNTIES)}")

    if failed_counties:
        logger.warning(f"Failed ({len(failed_counties)}): {', '.join(failed_counties)}")

    total_records = sum(e.get("record_count", 0) for e in state["completed"])
    logger.info(f"Total records: {total_records:,}")

    logger.info("\nTop 10 counties by record count:")
    for entry in completed_entries[:10]:
        logger.info(f"  {entry['county']:<20} {entry.get('record_count', 0):>7,}")

    return 1 if failed_counties else 0


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="HomeHarvest historical backfill for all 159 GA counties",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/homeharvest_backfill.py --years 5
  python scripts/homeharvest_backfill.py --years 5 --resume
  python scripts/homeharvest_backfill.py --years 5 --workers 4 --site zillow
  python scripts/homeharvest_backfill.py --years 5 --dry-run
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--years", type=int, help="Number of years to backfill")
    group.add_argument("--months", type=int, help="Number of months to backfill")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument(
        "--workers", type=int, default=1,
        help=f"Parallel workers (default 1, max {MAX_WORKERS_CAP})"
    )
    parser.add_argument("--site", type=str, default=SITE_NAME,
                        help="HomeHarvest source site (default: redfin)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print plan without scraping or writing")

    args = parser.parse_args()

    try:
        exit_code = backfill(
            years=args.years,
            months=args.months,
            resume=args.resume,
            workers=args.workers,
            site_name=args.site,
            dry_run=args.dry_run,
        )
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
