"""
HomeHarvest scraper for Georgia property sales.

Covers all 159 GA counties via Redfin/Zillow/Realtor.com (configured via site_name).
Returns beds, baths, lat/lon, and zip natively — no separate geocoding step needed.

Usage:
    from bronze.scrapers.homeharvest_scraper import scrape_county_to_bronze, GA_COUNTIES
    records, raw_count = scrape_county_to_bronze("fulton", "2024-01-01", "2024-12-31")
"""

import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import pandas as pd

from utils.logger import setup_logger

logger = setup_logger(__name__)

# Default site; switchable via --site flag
SITE_NAME = "redfin"

# All 159 Georgia counties (lowercase)
GA_COUNTIES: List[str] = [
    "appling", "atkinson", "bacon", "baker", "baldwin", "banks", "barrow",
    "bartow", "ben hill", "berrien", "bibb", "bleckley", "brantley", "brooks",
    "bryan", "bulloch", "burke", "butts", "calhoun", "camden", "candler",
    "carroll", "catoosa", "charlton", "chatham", "chattahoochee", "chattooga",
    "cherokee", "clarke", "clay", "clayton", "clinch", "cobb", "coffee",
    "colquitt", "columbia", "cook", "coweta", "crawford", "crisp", "dade",
    "dawson", "decatur", "dekalb", "dodge", "dooly", "dougherty", "douglas",
    "early", "echols", "effingham", "elbert", "emanuel", "evans", "fannin",
    "fayette", "floyd", "forsyth", "franklin", "fulton", "gilmer", "glascock",
    "glynn", "gordon", "grady", "greene", "gwinnett", "habersham", "hall",
    "hancock", "haralson", "harris", "hart", "heard", "henry", "houston",
    "irwin", "jackson", "jasper", "jeff davis", "jefferson", "jenkins",
    "johnson", "jones", "lamar", "lanier", "laurens", "lee", "liberty",
    "lincoln", "long", "lowndes", "lumpkin", "macon", "madison", "marion",
    "mcduffie", "mcintosh", "meriwether", "miller", "mitchell", "monroe",
    "montgomery", "morgan", "murray", "muscogee", "newton", "oconee",
    "oglethorpe", "paulding", "peach", "pickens", "pierce", "pike", "polk",
    "pulaski", "putnam", "quitman", "rabun", "randolph", "richmond",
    "rockdale", "schley", "screven", "seminole", "spalding", "stephens",
    "stewart", "sumter", "talbot", "taliaferro", "tattnall", "taylor",
    "telfair", "terrell", "thomas", "tift", "toombs", "towns", "treutlen",
    "troup", "turner", "twiggs", "union", "upson", "walker", "walton",
    "ware", "warren", "washington", "wayne", "webster", "wheeler", "white",
    "whitfield", "wilcox", "wilkes", "wilkinson", "worth",
]

# HomeHarvest style → silver property_type mapping
HH_PROPERTY_TYPE_MAP: Dict[str, str] = {
    "SINGLE_FAMILY": "sfh",
    "CONDO": "condo",
    "TOWNHOUSE": "townhome",
    "MULTI_FAMILY": "multi_family",
    "APARTMENT": "multi_family",
    "LAND": "land",
    "MOBILE": "mobile_home",
}


def scrape_county(
    county: str,
    date_from: str,
    date_to: str,
    site_name: str = SITE_NAME,  # kept for CLI compat; not used by current HH API
) -> pd.DataFrame:
    """
    Scrape sold listings for one county via HomeHarvest.

    Args:
        county: Lowercase county name (e.g. "fulton")
        date_from: Start date string "YYYY-MM-DD"
        date_to: End date string "YYYY-MM-DD"
        site_name: Unused (kept for CLI compatibility; current HH API has no site_name param)

    Returns:
        Raw DataFrame from HomeHarvest (may be empty)

    Raises:
        Exception: Propagated to caller; caller decides retry/skip logic.
    """
    from homeharvest import scrape_property  # deferred import so module loads without dep

    location = f"{county.title()} County, GA"
    logger.debug(f"scrape_county: {location} | {date_from} → {date_to}")

    df = scrape_property(
        location,
        listing_type="sold",
        date_from=date_from,
        date_to=date_to,
    )

    return df if df is not None else pd.DataFrame()


def map_hh_row_to_bronze(row: pd.Series, county: str, scraped_at: str) -> dict:
    """
    Map one HomeHarvest DataFrame row to a bronze record dict.

    Args:
        row: A single row from the HomeHarvest DataFrame
        county: Lowercase county name
        scraped_at: ISO timestamp string when the scrape ran

    Returns:
        Bronze record dict compatible with property_sales_hh schema
    """

    import math

    def _is_missing(val) -> bool:
        """True for None, pandas NA, NaN float."""
        if val is None:
            return True
        try:
            # pd.isna handles pd.NA, np.nan, None, float nan safely
            return bool(pd.isna(val))
        except (TypeError, ValueError):
            return False

    def _safe(val, default=None):
        return default if _is_missing(val) else val

    def _safe_float(val) -> Optional[float]:
        if _is_missing(val):
            return None
        try:
            v = float(val)
            return None if math.isnan(v) else v
        except (TypeError, ValueError):
            return None

    def _safe_int(val) -> Optional[int]:
        if _is_missing(val):
            return None
        try:
            v = float(val)
            return None if math.isnan(v) else int(v)
        except (TypeError, ValueError):
            return None

    # Assemble address
    street = _safe(row.get("street"), "")
    city = _safe(row.get("city"), "")
    state = _safe(row.get("state"), "GA")
    zip_code = _safe(row.get("zip_code"), "")

    address_parts = [p for p in [street, city, state, zip_code] if p]
    address = ", ".join(address_parts) if address_parts else None

    # Bathrooms: full + 0.5 * half
    full_baths = _safe_float(row.get("full_baths"))
    half_baths = _safe_float(row.get("half_baths"))
    if full_baths is not None or half_baths is not None:
        bathrooms = (full_baths or 0.0) + 0.5 * (half_baths or 0.0)
    else:
        bathrooms = None

    # Sale date → YYYY-MM-DD (HH column is last_sold_date)
    raw_date = row.get("last_sold_date") or row.get("sold_date") or row.get("date")
    sale_date = None
    if raw_date is not None:
        try:
            if isinstance(raw_date, str):
                sale_date = datetime.strptime(raw_date[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
            else:
                # pandas Timestamp or datetime
                sale_date = pd.Timestamp(raw_date).strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            sale_date = str(raw_date)[:10] if raw_date else None

    # Property type
    style = str(_safe(row.get("style"), "") or "").upper()
    property_type = HH_PROPERTY_TYPE_MAP.get(style, "other")

    return {
        # Identifiers
        "county": county,
        "parcel_id": None,  # Not available from HH
        "mls_id": _safe(row.get("mls_id")),
        # Address components (stored individually for easy reconstruction)
        "address": address,
        "street": _safe(street) or None,
        "city": _safe(city) or None,
        "state": _safe(state, "GA"),
        "zip_code": _safe(zip_code) or None,
        # Property characteristics
        "bedrooms": _safe_int(row.get("beds")),
        "bathrooms": bathrooms,
        "square_ft": _safe_float(row.get("sqft")),
        "year_built": _safe_int(row.get("year_built")),
        "lot_sqft": _safe_float(row.get("lot_sqft")),
        "acres": None,  # HH uses lot_sqft; acres left None
        "property_type": property_type,
        "style": _safe(row.get("style")),
        # Coordinates
        "lat": _safe_float(row.get("latitude")),
        "lon": _safe_float(row.get("longitude")),
        # Sale info
        "sale_date": sale_date,
        "sale_price": _safe_float(row.get("sold_price")),
        "list_price": _safe_float(row.get("list_price")),
        # Seller/buyer — not available in HH data
        "grantor": None,
        "grantee": None,
        # Validity
        "qualified_sale": True,
        "sales_validity": "MLS_SOLD",
        "data_source": "homeharvest",
        # Metadata
        "scraped_at": scraped_at,
    }


def _date_chunks(date_from: str, date_to: str, chunk_days: int = 90) -> List[Tuple[str, str]]:
    """
    Split a date range into chunks of at most chunk_days days.

    Returns list of ("YYYY-MM-DD", "YYYY-MM-DD") tuples, oldest-first.
    """
    start = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")
    chunks = []
    current = start
    while current < end:
        chunk_end = min(current + timedelta(days=chunk_days), end)
        chunks.append((current.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")))
        current = chunk_end
    return chunks


def scrape_county_to_bronze(
    county: str,
    date_from: str,
    date_to: str,
    site_name: str = SITE_NAME,
    chunk_days: int = 90,
) -> Tuple[List[dict], int]:
    """
    Top-level scrape function: fetch + map for one county, chunked by date.

    Splits the date range into chunk_days windows to stay under the 10k API
    limit, then deduplicates by mls_id before mapping to bronze dicts.

    Args:
        county: Lowercase county name
        date_from: Start date "YYYY-MM-DD"
        date_to: End date "YYYY-MM-DD"
        site_name: Kept for CLI compat (unused by current HH API)
        chunk_days: Days per chunk (default 90)

    Returns:
        (records, raw_count) — records is the mapped bronze list,
        raw_count is the total raw rows fetched across all chunks.
        Returns ([], 0) for empty results (not an error).

    Raises:
        Exception: On scrape failure (caller handles retry/skip).
    """
    import datetime as dt
    scraped_at = dt.datetime.now(dt.timezone.utc).isoformat()

    chunks = _date_chunks(date_from, date_to, chunk_days)
    frames = []

    for chunk_from, chunk_to in chunks:
        logger.debug(f"{county}: chunk {chunk_from} → {chunk_to}")
        df_chunk = scrape_county(county, chunk_from, chunk_to, site_name)
        if len(df_chunk) > 0:
            frames.append(df_chunk)
            if len(df_chunk) >= 9900:
                logger.warning(
                    f"{county}: chunk {chunk_from}→{chunk_to} returned {len(df_chunk)} rows "
                    f"(near limit — consider reducing chunk_days)"
                )

    if not frames:
        return [], 0

    df = pd.concat(frames, ignore_index=True)
    raw_count = len(df)

    # Deduplicate: prefer mls_id, fall back to address+date+price cols that exist
    FALLBACK_DEDUP_COLS = ["street", "city", "zip_code", "last_sold_date", "sold_date", "date", "sold_price", "price"]
    fallback_cols = [c for c in FALLBACK_DEDUP_COLS if c in df.columns]

    if "mls_id" in df.columns:
        has_mls = df["mls_id"].notna() & (df["mls_id"] != "")
        df_with = df[has_mls].drop_duplicates(subset=["mls_id"], keep="last")
        df_without = df[~has_mls].drop_duplicates(subset=fallback_cols, keep="last") \
            if fallback_cols else df[~has_mls]
        df = pd.concat([df_with, df_without], ignore_index=True)
    elif fallback_cols:
        df = df.drop_duplicates(subset=fallback_cols, keep="last")
    # else: no dedup possible — leave as-is

    logger.debug(f"{county}: {raw_count} raw rows → {len(df)} after dedup")

    records = []
    for _, row in df.iterrows():
        try:
            record = map_hh_row_to_bronze(row, county, scraped_at)
            records.append(record)
        except Exception as e:
            logger.warning(f"Skipping malformed row for {county}: {e}")

    return records, raw_count
