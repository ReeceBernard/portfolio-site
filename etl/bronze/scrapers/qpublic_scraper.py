"""
qPublic scraper for Fulton and DeKalb counties.
Uses cloudscraper to bypass Cloudflare protection.
"""

import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import time
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


# County configurations
COUNTY_CONFIGS = {
    "fulton": {
        "app_id": "936",
        "layer_id": "18251",
        "page_type_id": "2",
        "page_id": "8653",
        "date_format": "MM/DD/YYYY",
        "form_type": "range",
        "columns": {
            "parcel_id": 1,
            "address": 2,
            "owner_name": 3,
            "grantor": 4,
            "grantee": 5,
            "sale_date": 6,
            "sale_price": 7,
            "qualified_sales": 8,
            "sales_validity": 9,
            "acres": 10,
            "parcel_class": 11,
            "tax_district": 12,
            "year_built": 13,
            "square_ft": 14,
            "neighborhood": 15,
            "zoning": 16,
        }
    },
    "dekalb": {
        "app_id": "994",
        "layer_id": "20256",
        "page_type_id": "2",
        "page_id": "8829",
        "date_format": "YYYY-MM-DD",
        "form_type": "start_end",
        "columns": {
            "parcel_id": 1,
            "address": 2,
            "owner_name": 3,
            "grantor": 4,
            "grantee": 5,
            "sale_date": 6,
            "sale_price": 7,
            "sales_validity": 8,  # DeKalb only has sales_validity, no separate qualified_sales
            "acres": 10,
            "parcel_class": 11,
            "tax_district": 12,
            "year_built": 13,
            "square_ft": 14,
            "neighborhood": 15,
        }
    },
    "cobb": {
        "app_id": "1051",
        "layer_id": "23951",
        "page_type_id": "2",
        "page_id": "9970",
        "date_format": "MM/DD/YYYY",
        "form_type": "range",
        "columns": {
            "parcel_id": 1,
            "address": 2,
            "owner_name": 3,
            # owner_address at 4 (not needed)
            "grantor": 5,
            "grantee": 6,
            "sale_date": 7,
            "sale_price": 8,
            "sales_validity": 9,  # Cobb only has sales_validity, no qualified_sales
            "acres": 10,
            "tax_district": 11,
            "square_ft": 12,
            "neighborhood": 13,
            "zoning": 14,
            # No parcel_class or year_built columns in Cobb
        }
    },
    "gwinnett": {
        "app_id": "1282",
        "layer_id": "43872",
        "page_type_id": "2",
        "page_id": "16260",
        "date_format": "YYYY-MM-DD",
        "form_type": "range",
        "columns": {
            "parcel_id": 1,
            "neighborhood": 2,
            "address": 3,
            "parcel_class": 4,
            "year_built": 7,
            "acres": 9,
            "sale_date": 12,
            "sale_price": 13,
            "qualified_sales": 14,
            "sales_validity": 15,
            "square_ft": 18,
            "tax_district": 23,
        }
    },
}


class QPublicScraper:
    """Scraper for counties using qPublic (Schneider Corp) system."""

    def __init__(self, county: str, rate_limit_seconds: float = 1.5):
        """
        Initialize qPublic scraper.

        Args:
            county: County name (fulton, dekalb, cobb, or gwinnett)
            rate_limit_seconds: Delay between requests to avoid bans
        """
        self.county = county.lower()

        if self.county not in COUNTY_CONFIGS:
            raise ValueError(f"County {county} not supported. Supported: {list(COUNTY_CONFIGS.keys())}")

        self.config = COUNTY_CONFIGS[self.county]
        self.rate_limit_seconds = rate_limit_seconds

        # Create cloudscraper session to bypass Cloudflare
        self.scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "desktop": True}
        )

        # Build base URL
        self.base_url = (
            f"https://qpublic.schneidercorp.com/Application.aspx"
            f"?AppID={self.config['app_id']}"
            f"&LayerID={self.config['layer_id']}"
            f"&PageTypeID={self.config['page_type_id']}"
            f"&PageID={self.config['page_id']}"
        )

    def scrape_recent_sales(self, days: int = 14) -> List[Dict]:
        """
        Scrape recent sales for the county.

        Args:
            days: Number of days to look back

        Returns:
            List of property sale records
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        return self.scrape_sales_by_date_range(start_date, end_date)

    def scrape_sales_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Scrape sales for a specific date range.

        Args:
            start_date: Start date for search
            end_date: End date for search

        Returns:
            List of property sale records
        """
        logger.info(f"{self.county.upper()}: Fetching form...")

        # Step 1: Get the initial form to extract ViewState
        response = self.scraper.get(self.base_url)

        if response.status_code != 200:
            logger.error(f"Failed to fetch form: {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        viewstate_input = soup.find("input", {"name": "__VIEWSTATE"})
        viewstate_gen_input = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})

        if not viewstate_input:
            logger.error("Could not find ViewState")
            return []

        viewstate = viewstate_input["value"]
        viewstate_gen = viewstate_gen_input["value"]

        # Step 2: Build form data (different for each county)
        form_data = self._build_form_data(
            viewstate,
            viewstate_gen,
            start_date,
            end_date
        )

        # Rate limit
        time.sleep(self.rate_limit_seconds)

        # Step 3: Submit search form
        logger.info(f"Submitting search: {start_date.strftime('%m/%d/%Y')} to {end_date.strftime('%m/%d/%Y')}")
        response = self.scraper.post(self.base_url, data=form_data)

        if response.status_code != 200:
            logger.error(f"Search failed: {response.status_code}")
            return []

        # Step 4: Parse results
        sales = self._parse_results(response.text)

        logger.info(f"Found {len(sales)} sales")
        return sales

    def _build_form_data(
        self,
        viewstate: str,
        viewstate_gen: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Build form data for search submission."""

        # Format dates according to county requirements
        if self.config["date_format"] == "YYYY-MM-DD":
            start_formatted = start_date.strftime("%Y-%m-%d")
            end_formatted = end_date.strftime("%Y-%m-%d")
        else:  # MM/DD/YYYY
            start_formatted = start_date.strftime("%m/%d/%Y")
            end_formatted = end_date.strftime("%m/%d/%Y")

        # Build form data based on county form type
        if self.config["form_type"] == "range":  # Fulton, Cobb, and Gwinnett
            return {
                "__EVENTTARGET": "ctlBodyPane$ctl00$ctl01$btnSearch",
                "__VIEWSTATE": viewstate,
                "__VIEWSTATEGENERATOR": viewstate_gen,
                "ctlBodyPane$ctl00$ctl01$RadioSaleDateGroup": "rdbUseSaleDateRange",
                "ctlBodyPane$ctl00$ctl01$txtSaleDateLowDetail": start_formatted,
                "ctlBodyPane$ctl00$ctl01$txtSaleDateHighDetail": end_formatted,
                "ctlBodyPane$ctl00$ctl01$rdQualifiedSales": "All",
            }
        else:  # DeKalb - start_end
            return {
                "__EVENTTARGET": "ctlBodyPane$ctl00$ctl01$btnSearch",
                "__VIEWSTATE": viewstate,
                "__VIEWSTATEGENERATOR": viewstate_gen,
                "ctlBodyPane$ctl00$ctl01$txtStartSaleDate": start_formatted,
                "ctlBodyPane$ctl00$ctl01$txtEndSaleDate": end_formatted,
                "ctlBodyPane$ctl00$ctl01$rdQualifiedSales": "All",
            }

    def _parse_results(self, html: str) -> List[Dict]:
        """
        Parse sales results from HTML.

        Note: qPublic results can have multiple sales per property row,
        separated by <br> tags. We split these into individual sale records.
        """

        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", {"class": "tabular-data"})

        if not table:
            logger.warning("No results table found")
            return []

        sales = []
        tbody = table.find("tbody")

        if not tbody:
            return []

        rows = tbody.find_all("tr")

        for row in rows:
            cells = row.find_all("td")

            # Need at least 10 columns for basic data
            if len(cells) < 10:
                continue

            # Get column mappings for this county
            cols = self.config["columns"]

            # Extract property-level data using county-specific column indices
            parcel_id = cells[cols["parcel_id"]].get_text(strip=True) if len(cells) > cols["parcel_id"] else ""
            address = cells[cols["address"]].get_text(strip=True) if len(cells) > cols["address"] else ""

            # Optional fields (not all counties have these)
            neighborhood = cells[cols.get("neighborhood", 999)].get_text(strip=True) if len(cells) > cols.get("neighborhood", 999) else ""
            parcel_class = cells[cols.get("parcel_class", 999)].get_text(separator=" ", strip=True) if len(cells) > cols.get("parcel_class", 999) else ""

            # Year built may have multiple values (additions/multiple buildings) - take the first
            if "year_built" in cols and len(cells) > cols["year_built"]:
                year_built_values = self._split_cell_content(cells[cols["year_built"]])
                year_built = year_built_values[0] if year_built_values and year_built_values[0] else ""
            else:
                year_built = ""

            acres = cells[cols.get("acres", 999)].get_text(strip=True) if len(cells) > cols.get("acres", 999) else ""
            square_ft = cells[cols.get("square_ft", 999)].get_text(strip=True).replace(",", "") if len(cells) > cols.get("square_ft", 999) else ""
            tax_district = cells[cols.get("tax_district", 999)].get_text(strip=True) if len(cells) > cols.get("tax_district", 999) else ""
            owner_name = cells[cols.get("owner_name", 999)].get_text(strip=True) if len(cells) > cols.get("owner_name", 999) else ""
            zoning = cells[cols.get("zoning", 999)].get_text(strip=True) if len(cells) > cols.get("zoning", 999) else ""

            # Extract sale-specific data (may be multiple per row, split by <br>)
            sale_dates = self._split_cell_content(cells[cols["sale_date"]]) if len(cells) > cols["sale_date"] else [""]
            sale_prices = self._split_cell_content(cells[cols["sale_price"]]) if len(cells) > cols["sale_price"] else [""]

            # qualified_sales is optional (DeKalb and Cobb don't have it)
            if "qualified_sales" in cols and len(cells) > cols["qualified_sales"]:
                sale_quals = self._split_cell_content(cells[cols["qualified_sales"]])
            else:
                sale_quals = [""]

            sale_codes = self._split_cell_content(cells[cols.get("sales_validity", 999)]) if len(cells) > cols.get("sales_validity", 999) else [""]

            # Grantor/Grantee (Fulton/Cobb/DeKalb have these, Gwinnett doesn't)
            if "grantor" in cols and len(cells) > cols["grantor"]:
                grantors = self._split_cell_content(cells[cols["grantor"]])
            else:
                grantors = [""]

            if "grantee" in cols and len(cells) > cols["grantee"]:
                grantees = self._split_cell_content(cells[cols["grantee"]])
            else:
                grantees = [""]

            # Create one record per sale
            # If counts don't match, zip will stop at shortest (which is safe)
            num_sales = max(len(sale_dates), len(sale_prices), len(sale_quals), len(sale_codes))

            for i in range(num_sales):
                sale_date = sale_dates[i] if i < len(sale_dates) else ""
                sale_price = sale_prices[i] if i < len(sale_prices) else ""
                qualified_sales = sale_quals[i] if i < len(sale_quals) else ""
                sales_validity = sale_codes[i] if i < len(sale_codes) else ""
                grantor = grantors[i] if i < len(grantors) else ""
                grantee = grantees[i] if i < len(grantees) else ""

                # Clean sale price (remove $, commas)
                if sale_price:
                    sale_price = sale_price.replace("$", "").replace(",", "").strip()

                sale = {
                    "county": self.county,
                    "parcel_id": parcel_id,
                    "address": address,
                    "neighborhood": neighborhood,
                    "parcel_class": parcel_class,
                    "year_built": year_built,
                    "acres": acres,
                    "square_ft": square_ft,
                    "tax_district": tax_district,
                    "owner_name": owner_name,
                    "zoning": zoning,
                    "sale_date": sale_date,
                    "sale_price": sale_price,
                    "qualified_sales": qualified_sales,
                    "sales_validity": sales_validity,
                    "grantor": grantor,
                    "grantee": grantee,
                    "scraped_at": datetime.now().isoformat(),
                }

                sales.append(sale)

        return sales

    def _split_cell_content(self, cell) -> List[str]:
        """
        Split cell content by <br> tags.

        Args:
            cell: BeautifulSoup cell element

        Returns:
            List of text values
        """
        # Get all text, then split by newlines (bs4 converts <br> to \n)
        text = cell.get_text(separator="\n", strip=True)
        if not text:
            return [""]

        # Split and clean
        parts = [part.strip() for part in text.split("\n") if part.strip()]
        return parts if parts else [""]

    def scrape_property_details(self, parcel_id: str) -> Optional[Dict]:
        """
        Scrape detailed property information by parcel ID.

        Args:
            parcel_id: County parcel ID

        Returns:
            Property details dictionary (not yet implemented)
        """
        # TODO: Implement property detail scraping
        raise NotImplementedError("Property detail scraping to be implemented")

    def close(self):
        """Clean up session."""
        if hasattr(self.scraper, 'close'):
            self.scraper.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
