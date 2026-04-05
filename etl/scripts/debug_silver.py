"""
Inspect silver layer: column coverage + validity field samples.
Usage: python scripts/debug_silver.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import duckdb
from utils.config import Config
from datetime import datetime, timedelta

BUCKET = Config.S3_BUCKET_NAME

conn = duckdb.connect()
conn.execute("INSTALL httpfs; LOAD httpfs;")

# ── properties coverage ───────────────────────────────────────────────────────

print("\n=== properties column coverage ===")
col_rows = conn.execute(f"""
    DESCRIBE SELECT * FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') LIMIT 1
""").fetchall()
col_names = [r[0] for r in col_rows]

total = conn.execute(f"""
    SELECT COUNT(*) FROM read_parquet('s3://{BUCKET}/silver/properties.parquet')
""").fetchone()[0]

print(f"  total rows: {total:,}")
print(f"  {'column':30s} {'type':20s} {'non-null':>10} {'empty_str':>10} {'coverage':>10}")
print(f"  {'-'*30} {'-'*20} {'-'*10} {'-'*10} {'-'*10}")
for col, dtype, *_ in col_rows:
    r = conn.execute(f"""
        SELECT
            COUNT({col}) AS non_null,
            SUM(CASE WHEN CAST({col} AS VARCHAR) = '' THEN 1 ELSE 0 END) AS empty_str
        FROM read_parquet('s3://{BUCKET}/silver/properties.parquet')
    """).fetchone()
    non_null, empty = r[0], r[1] or 0
    pct = f"{100*non_null/total:.0f}%" if total else "n/a"
    print(f"  {col:30s} {dtype:20s} {non_null:>10,} {empty:>10,} {pct:>10}")

# ── sales_transactions coverage ───────────────────────────────────────────────

print("\n=== sales_transactions column coverage ===")
col_rows_s = conn.execute(f"""
    DESCRIBE SELECT * FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') LIMIT 1
""").fetchall()

total_s = conn.execute(f"""
    SELECT COUNT(*) FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet')
""").fetchone()[0]

print(f"  total rows: {total_s:,}")
print(f"  {'column':30s} {'type':20s} {'non-null':>10} {'empty_str':>10} {'coverage':>10}")
print(f"  {'-'*30} {'-'*20} {'-'*10} {'-'*10} {'-'*10}")
for col, dtype, *_ in col_rows_s:
    r = conn.execute(f"""
        SELECT
            COUNT({col}) AS non_null,
            SUM(CASE WHEN CAST({col} AS VARCHAR) = '' THEN 1 ELSE 0 END) AS empty_str
        FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet')
    """).fetchone()
    non_null, empty = r[0], r[1] or 0
    pct = f"{100*non_null/total_s:.0f}%" if total_s else "n/a"
    print(f"  {col:30s} {dtype:20s} {non_null:>10,} {empty:>10,} {pct:>10}")

# ── validity field distinct values ────────────────────────────────────────────

print("\n=== distinct sales_validity values (top 20) ===")
rows = conn.execute(f"""
    SELECT sales_validity, COUNT(*) AS cnt
    FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet')
    GROUP BY sales_validity
    ORDER BY cnt DESC
    LIMIT 20
""").fetchall()
for row in rows:
    print(f"  {str(row[0]):50s} {row[1]:>10,}")

print("\n=== distinct qualified_sale values ===")
rows = conn.execute(f"""
    SELECT qualified_sale, COUNT(*) AS cnt
    FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet')
    GROUP BY qualified_sale
    ORDER BY cnt DESC
""").fetchall()
for row in rows:
    print(f"  {str(row[0]):20s} {row[1]:>10,}")

print("\n=== is_valid breakdown ===")
rows = conn.execute(f"""
    SELECT is_valid, COUNT(*) AS cnt
    FROM read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet')
    GROUP BY is_valid
    ORDER BY cnt DESC
""").fetchall()
for row in rows:
    print(f"  {str(row[0]):20s} {row[1]:>10,}")

print("\n=== qualified_sale + is_valid by county ===")
rows = conn.execute(f"""
    SELECT p.county,
           COUNT(*) AS total,
           SUM(CASE WHEN s.qualified_sale = true THEN 1 ELSE 0 END) AS qualified,
           SUM(CASE WHEN s.is_valid = true THEN 1 ELSE 0 END) AS valid,
           SUM(CASE WHEN s.qualified_sale = true AND s.is_valid = true THEN 1 ELSE 0 END) AS both
    FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') p
    JOIN read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') s
        ON p.property_id = s.property_id
    GROUP BY p.county
    ORDER BY p.county
""").fetchall()
print(f"  {'county':12s} {'total':>10} {'qualified':>12} {'is_valid':>10} {'both':>10}")
print(f"  {'-'*12} {'-'*10} {'-'*12} {'-'*10} {'-'*10}")
for row in rows:
    print(f"  {str(row[0]):12s} {row[1]:>10,} {row[2]:>12,} {row[3]:>10,} {row[4]:>10,}")

# ── sale date range ───────────────────────────────────────────────────────────

print("\n=== sale_date range by county ===")
rows = conn.execute(f"""
    SELECT p.county, MIN(s.sale_date) AS earliest, MAX(s.sale_date) AS latest, COUNT(*) AS cnt
    FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') p
    JOIN read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') s
        ON p.property_id = s.property_id
    GROUP BY p.county
    ORDER BY p.county
""").fetchall()
for row in rows:
    print(f"  {str(row[0]):12s} earliest={str(row[1])[:10]}  latest={str(row[2])[:10]}  count={row[3]:,}")

# ── dekalb breakdown without date filter ─────────────────────────────────────

print("\n=== dekalb comps — no date filter, no validity filter ===")
rows = conn.execute(f"""
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN s.is_valid = true THEN 1 ELSE 0 END) AS valid,
           SUM(CASE WHEN s.qualified_sale = true THEN 1 ELSE 0 END) AS qualified,
           SUM(CASE WHEN s.is_valid = true AND s.qualified_sale = true THEN 1 ELSE 0 END) AS both
    FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') p
    JOIN read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') s
        ON p.property_id = s.property_id
    WHERE LOWER(p.county) = 'dekalb'
""").fetchall()
r = rows[0]
print(f"  total={r[0]:,}  is_valid={r[1]:,}  qualified={r[2]:,}  both={r[3]:,}")

# ── sample comps (county query) ───────────────────────────────────────────────

print("\n=== sample comps query — dekalb county, last 3 years ===")
min_date = (datetime.now() - timedelta(days=3*365)).strftime('%Y-%m-%d')
rows = conn.execute(f"""
    SELECT p.address, p.property_type, CAST(p.square_ft AS INTEGER),
           CAST(s.sale_date AS VARCHAR), CAST(s.sale_price AS DOUBLE)
    FROM read_parquet('s3://{BUCKET}/silver/properties.parquet') p
    JOIN read_parquet('s3://{BUCKET}/silver/sales_transactions.parquet') s
        ON p.property_id = s.property_id
    WHERE LOWER(p.county) = 'dekalb'
      AND s.is_valid = true
      AND s.qualified_sale = true
      AND s.sale_price > 10000
      AND s.sale_date >= '{min_date}'
    ORDER BY s.sale_date DESC
    LIMIT 10
""").fetchall()
print(f"  returned {len(rows)} rows (min_date={min_date})")
for row in rows:
    print(f"  {row[3][:10]} | ${row[4]:>10,.0f} | {str(row[2]):>7} sqft | {str(row[1]):25s} | {row[0]}")

conn.close()
