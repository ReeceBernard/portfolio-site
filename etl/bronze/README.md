# Bronze Layer - Raw Data Ingestion

The bronze layer contains **raw, unprocessed data** from multiple external sources. Each data source has its own scraper and schema definition.

## Architecture

```
bronze/
├── scrapers/          # Data ingestion scrapers
│   ├── qpublic_scraper.py      # Property sales (all 4 counties)
│   └── foreclosure_scraper.py  # Foreclosure listings (future)
│
└── schemas/           # Bronze data schemas
    ├── property_sales.py       # Property sales schema
    └── foreclosures.py         # Foreclosure schema
```

## Data Sources

### 1. Property Sales (`property_sales`)

**Scraper**: `scrapers/qpublic_scraper.py`
**Source**: qPublic (Schneider Corp) county websites
**Counties**: Fulton, Gwinnett, Cobb, DeKalb
**Update Frequency**: Weekly (manual), eventually daily (automated)

**S3 Path**: `s3://dealscout-data-dev/bronze/property_sales/{county}/{date}.json`

**Schema**: See `schemas/property_sales.py`

**Features**:
- Uses cloudscraper to bypass Cloudflare protection
- Handles county-specific form submissions
- Rate limiting to avoid bans
- Extracts sales transactions with dates, prices, buyer/seller info

**Example**:
```python
from bronze.scrapers.qpublic_scraper import QPublicScraper
from utils.s3_client import S3Client

scraper = QPublicScraper('fulton')
with scraper:
    data = scraper.scrape_recent_sales(days=14)

s3_client = S3Client('dealscout-data-dev')
s3_client.write_bronze('property_sales', 'fulton', data)
# Writes to: s3://dealscout-data-dev/bronze/property_sales/fulton/2026-01-08.json
```

### 2. Foreclosure Listings (`foreclosures`) - FUTURE

**Scraper**: `scrapers/foreclosure_scraper.py` (template only)
**Source**: GeorgiaPublicNotice.com, county clerk records
**Counties**: Fulton, Gwinnett, Cobb, DeKalb
**Update Frequency**: Daily (automated)

**S3 Path**: `s3://dealscout-data-dev/bronze/foreclosures/{county}/{date}.json`

**Schema**: See `schemas/foreclosures.py`

**Use Case**: Track properties from foreclosure filing → auction → resale to identify successful flippers

## Bronze Layer Principles

1. **Raw and Complete**: Store exactly what we scraped (no cleaning, no filtering)
2. **Immutable**: Never modify bronze files after writing
3. **Dated**: Each file represents data scraped on a specific date
4. **Partitioned**: Organized by source → county → date
5. **JSON Format**: Human-readable for debugging and validation

## Usage

See `scripts/scrape.py` for how to run scrapers manually.

## Adding a New Bronze Source

To add a new data source:

1. **Create scraper** in `scrapers/{source}_scraper.py`
2. **Define schema** in `schemas/{source}.py`
3. **Update S3 client calls**: `s3_client.write_bronze('new_source', county, data)`
4. **Create script** in `scripts/scrape_{source}.py`

## Next Steps

After bronze ingestion, data flows to:
- **Silver Layer**: Clean, standardize, and merge bronze sources
- **Gold Layer**: Aggregate and enrich for analytics
