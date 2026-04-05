"""Validate silver layer output."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import duckdb
import pandas as pd

def main():
    silver_path = Path(__file__).parent.parent / "data" / "silver"

    # Load tables
    properties = pd.read_parquet(silver_path / "properties.parquet")
    sales = pd.read_parquet(silver_path / "sales_transactions.parquet")
    entities = pd.read_parquet(silver_path / "entities.parquet")

    print("="*60)
    print("SILVER LAYER VALIDATION")
    print("="*60)
    print(f"\nRow Counts:")
    print(f"  Properties:          {len(properties):,}")
    print(f"  Sales Transactions:  {len(sales):,}")
    print(f"  Entities:            {len(entities):,}")

    print(f"\n" + "="*60)
    print("PROPERTIES TABLE SAMPLE")
    print("="*60)
    print(properties[['property_id', 'county', 'address', 'property_type', 'square_ft', 'year_built']].head(3).to_string())

    print(f"\n" + "="*60)
    print("SALES TRANSACTIONS SAMPLE")
    print("="*60)
    print(sales[['sale_id', 'property_id', 'sale_date', 'sale_price', 'grantee', 'is_valid']].head(3).to_string())

    print(f"\n" + "="*60)
    print("ENTITIES TABLE SAMPLE (Top 5 by transactions)")
    print("="*60)
    top_entities = entities.nlargest(5, 'transaction_count')[['entity_id', 'normalized_name', 'entity_type', 'transaction_count']]
    print(top_entities.to_string())

    print(f"\n" + "="*60)
    print("DATA QUALITY CHECKS")
    print("="*60)

    # Check for nulls in key fields
    print(f"\nKey Field Completeness:")
    print(f"  Properties with NULL property_id: {properties['property_id'].isna().sum()}")
    print(f"  Sales with NULL sale_id: {sales['sale_id'].isna().sum()}")
    print(f"  Entities with NULL entity_id: {entities['entity_id'].isna().sum()}")

    # Property types
    print(f"\nProperty Type Distribution:")
    for ptype, count in properties['property_type'].value_counts().items():
        print(f"  {ptype:20} {count:,}")

    # Entity types
    print(f"\nEntity Type Distribution:")
    for etype, count in entities['entity_type'].value_counts().items():
        print(f"  {etype:20} {count:,}")

    # Valid sales
    print(f"\nSales Validity:")
    valid_count = sales['is_valid'].sum()
    invalid_count = (~sales['is_valid']).sum()
    print(f"  Valid sales:   {valid_count:,}")
    print(f"  Invalid sales: {invalid_count:,}")
    print(f"  Valid %:       {valid_count/(valid_count+invalid_count)*100:.1f}%")

    # Entity linking
    print(f"\nEntity Linking:")
    buyer_linked = sales['grantee_entity_id'].notna().sum()
    seller_linked = sales['grantor_entity_id'].notna().sum()
    print(f"  Sales with buyer entity:  {buyer_linked:,} ({buyer_linked/len(sales)*100:.1f}%)")
    print(f"  Sales with seller entity: {seller_linked:,} ({seller_linked/len(sales)*100:.1f}%)")

    # Year built
    print(f"\nYear Built:")
    print(f"  Properties with year_built: {properties['year_built'].notna().sum()}")
    print(f"  Properties without year_built: {properties['year_built'].isna().sum()}")
    if properties['year_built'].notna().any():
        print(f"  Year range: {int(properties['year_built'].min())} - {int(properties['year_built'].max())}")

    # Zip codes
    zip_count = properties['zip_code'].notna().sum()
    print(f"\nZip Codes Extracted:")
    print(f"  Properties with zip code: {zip_count} ({zip_count/len(properties)*100:.1f}%)")

    # Check for duplicates
    print(f"\nDuplicate Detection:")
    dup_sales = sales['sale_id'].duplicated().sum()
    dup_props = properties['property_id'].duplicated().sum()
    print(f"  Duplicate sale_ids: {dup_sales}")
    print(f"  Duplicate property_ids: {dup_props}")

    # Sample entity normalization
    print(f"\n" + "="*60)
    print("ENTITY NORMALIZATION EXAMPLES")
    print("="*60)
    sample_entities = entities[entities['transaction_count'] > 1].head(3)
    for _, entity in sample_entities.iterrows():
        print(f"\nEntity: {entity['normalized_name']}")
        print(f"  Type: {entity['entity_type']}")
        print(f"  Transactions: {entity['transaction_count']}")
        print(f"  Raw names: {entity['raw_names'][:3]}...")  # Show first 3

    print(f"\n" + "="*60)
    print("✅ VALIDATION COMPLETE")
    print("="*60)

if __name__ == '__main__':
    main()
