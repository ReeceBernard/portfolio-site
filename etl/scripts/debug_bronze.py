"""
Inspect bronze layer: show all fields and check for zip codes.
Usage: python scripts/debug_bronze.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import duckdb
import boto3
from utils.config import Config

BUCKET = Config.S3_BUCKET_NAME
COUNTIES = ['cobb', 'dekalb', 'fulton', 'gwinnett']

conn = duckdb.connect()
conn.execute("INSTALL httpfs; LOAD httpfs;")

# Read one file per county to keep it fast
s3 = boto3.client('s3')

for county in COUNTIES:
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=f"bronze/property_sales/{county}/", MaxKeys=1)
    if not resp.get('Contents'):
        print(f"\n{county}: no files found")
        continue
    key = resp['Contents'][0]['Key']
    s3_path = f"s3://{BUCKET}/{key}"

    print(f"\n=== {county} — {key.split('/')[-1]} ===")

    # All columns
    col_rows = conn.execute(f"""
        DESCRIBE SELECT * FROM read_json_auto('{s3_path}') LIMIT 1
    """).fetchall()
    total = conn.execute(f"SELECT COUNT(*) FROM read_json_auto('{s3_path}')").fetchone()[0]
    print(f"  {total:,} records, {len(col_rows)} fields:")

    # Check each column for zip-like content and coverage
    print(f"  {'field':30s} {'non-null':>10} {'sample value'}")
    print(f"  {'-'*30} {'-'*10} {'-'*30}")
    for col, dtype, *_ in col_rows:
        r = conn.execute(f"""
            SELECT COUNT({col}),
                   MAX(CAST({col} AS VARCHAR))
            FROM read_json_auto('{s3_path}')
        """).fetchone()
        non_null, sample = r[0], str(r[1] or '')[:50]
        print(f"  {col:30s} {non_null:>10,} {sample!r}")

    # Specifically look for any field containing a 5-digit zip
    print(f"\n  Checking all string fields for 5-digit zip patterns...")
    found_zip = False
    for col, dtype, *_ in col_rows:
        if 'varchar' not in dtype.lower() and 'json' not in dtype.lower():
            continue
        r = conn.execute(f"""
            SELECT COUNT(*), MAX(CAST({col} AS VARCHAR))
            FROM read_json_auto('{s3_path}')
            WHERE regexp_matches(CAST({col} AS VARCHAR), '\\b\\d{{5}}\\b')
        """).fetchone()
        if r[0] and r[0] > 0:
            print(f"  ✓ field '{col}' has zip-like values: {r[0]:,} rows — e.g. {str(r[1])[:60]!r}")
            found_zip = True
    if not found_zip:
        print(f"  ✗ no zip codes found in any field")

conn.close()
