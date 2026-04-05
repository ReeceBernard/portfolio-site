"""Schema for property sales bronze data."""

from typing import TypedDict, Optional
from datetime import datetime


class PropertySaleSchema(TypedDict):
    """
    Bronze layer schema for property sales from qPublic.

    This is the raw data structure scraped from county websites.
    Maps directly to what qpublic_scraper returns.
    """

    # Identifiers
    county: str              # fulton, gwinnett, cobb, dekalb
    parcel_id: str           # County parcel ID

    # Property info
    address: str
    owner_name: str
    year_built: str          # Raw string from scraper
    square_ft: str           # Raw string from scraper
    acres: str               # Raw string from scraper
    parcel_class: str        # Property type/class
    neighborhood: str
    zoning: str
    tax_district: str

    # Sale info
    sale_date: str           # Raw date string from scraper
    sale_price: str          # Raw price string from scraper (already stripped of $ and ,)
    grantor: str             # Seller
    grantee: str             # Buyer
    qualified_sales: str     # Q/NQ indicator
    sales_validity: str      # Validity code

    # Metadata
    scraped_at: str          # ISO timestamp when scraped


# Example bronze record:
EXAMPLE_PROPERTY_SALE = {
    "county": "fulton",
    "parcel_id": "14 0087 0001 001 0",
    "address": "123 PEACHTREE ST NE",
    "owner_name": "SMITH JOHN & JANE",
    "grantor": "SMITH JOHN",
    "grantee": "ABC PROPERTIES LLC",
    "sale_date": "12/15/2025",
    "sale_price": "450000",
    "qualified_sales": "Q",
    "sales_validity": "01",
    "acres": "0.25",
    "parcel_class": "RESIDENTIAL",
    "tax_district": "ATLANTA",
    "year_built": "1985",
    "square_ft": "2200",
    "neighborhood": "MIDTOWN",
    "zoning": "R4",
    "scraped_at": "2026-01-08T10:30:00"
}
