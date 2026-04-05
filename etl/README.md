# DealScout ETL Pipeline

This directory contains the data extraction, transformation, and loading pipeline for DealScout.

## Structure

- `scrapers/` - County-specific web scrapers
- `transformers/` - Data transformation logic (bronze → silver → gold)
- `handlers/` - Lambda entry points
- `utils/` - Shared utilities (S3, logging, config)
- `scripts/` - Manual execution scripts

## Usage

### Local Development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Manual Scrape

```bash
# Scrape single county (last 14 days)
python scripts/scrape.py --county fulton --days 14

# Scrape all 4 counties (with 30s delays between counties)
python scripts/scrape_all.py --days 14

# Save to local files instead of S3 (for testing)
python scripts/scrape_all.py --days 14 --local
```

**Rate Limiting:**
- 1.5 seconds between individual requests (within a county)
- 30 seconds between counties (to avoid detection)
- Total runtime for all counties: ~2-5 minutes depending on data volume

### Historical Backfill

```bash
# Backfill 7 years of data (182 windows, ~10 hours)
python scripts/backfill.py --years 7

# Test with 30 days locally first
python scripts/backfill.py --days 30 --local

# Resume from checkpoint if interrupted
python scripts/backfill.py --years 7 --resume

# Start from specific date
python scripts/backfill.py --start-from 2020-01-01
```

**Backfill Details:**
- Scrapes in 14-day windows working backwards
- Checkpointing: automatically saves progress every window
- Resumable: if interrupted, use `--resume` to continue
- 7 years = 182 windows × 4 counties = 728 total scrapes
- Estimated runtime: ~10 hours with delays
- Checkpoint file: `etl/data/backfill_checkpoint.json`

### Transform Data Layers

**Bronze → Silver (Normalize & Clean):**
```bash
# Transform from S3
python scripts/transform_bronze_to_silver.py

# Transform from local files (for testing)
python scripts/transform_bronze_to_silver.py --local

# Custom paths
python scripts/transform_bronze_to_silver.py --local \
  --bronze-path data/backfill \
  --output-path data/silver
```

**Silver → Gold (Denormalize & Aggregate):**
```bash
# Transform from S3
python scripts/transform_silver_to_gold.py

# Transform from local files (for testing)
python scripts/transform_silver_to_gold.py --local

# Custom paths
python scripts/transform_silver_to_gold.py --local \
  --silver-path data/silver \
  --output-path data/gold
```

**Full Pipeline (Test locally):**
```bash
# 1. Scrape 30 days
python scripts/backfill.py --days 30 --local

# 2. Transform to silver
python scripts/transform_bronze_to_silver.py --local

# 3. Transform to gold
python scripts/transform_silver_to_gold.py --local

# 4. Check results
ls -lh data/silver/
ls -lh data/gold/
```

## Data Layers

### Bronze Layer (Raw Data)
- **Format:** JSON files
- **Location:** `s3://dealscout-data-dev/bronze/property_sales/{county}/{date}.json`
- **Content:** Raw scraped data from qPublic, one file per county per date range
- **Updates:** Append-only, new scrapes add new files

### Silver Layer (Normalized Data)
- **Format:** Parquet files
- **Location:** `s3://dealscout-data-dev/silver/`
- **Tables:**
  - `properties.parquet` - Unique properties with latest characteristics
  - `sales_transactions.parquet` - All sale events with entity links
  - `entities.parquet` - Normalized buyer/seller entities
- **Updates:** Full rebuild from all bronze files

### Gold Layer (Analytics-Ready)
- **Format:** Parquet files
- **Location:** `s3://dealscout-data-dev/gold/`
- **Tables:**
  - `property_sales_history.parquet` - Denormalized property + sales + metrics
  - `flip_analysis.parquet` - Properties flipped with profit analysis
  - `investor_portfolios.parquet` - Entity investment activity
  - `market_trends.parquet` - Time-series trends by area
- **Updates:** Full rebuild from silver tables

## Data Flow

```
Bronze (Raw)  →  Silver (Clean)  →  Gold (Analytics)
    JSON      →      Parquet      →     Parquet

Scrapers      →  Normalize       →  Denormalize
              →  Deduplicate     →  Calculate metrics
              →  Entity matching →  Aggregate
```

## Counties Supported

- Fulton (qPublic)
- Gwinnett (qPublic)
- Cobb (qPublic)
- DeKalb (custom portal)
