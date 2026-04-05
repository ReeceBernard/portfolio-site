"""Debug scraper to see what's actually being returned."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bronze.scrapers.qpublic_scraper import QPublicScraper
from datetime import datetime, timedelta

# Test with Gwinnett (should have lots of sales)
county = "gwinnett"
scraper = QPublicScraper(county)

end_date = datetime.now()
start_date = end_date - timedelta(days=14)

print(f"Testing {county} scraper...")
print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")

# Do the scrape
with scraper:
    # Get the raw HTML response
    response = scraper.scraper.get(scraper.base_url)
    soup = __import__('bs4').BeautifulSoup(response.text, "html.parser")

    viewstate_input = soup.find("input", {"name": "__VIEWSTATE"})
    viewstate_gen_input = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})

    if not viewstate_input:
        print("ERROR: No ViewState found")
        sys.exit(1)

    viewstate = viewstate_input["value"]
    viewstate_gen = viewstate_gen_input["value"]

    form_data = scraper._build_form_data(viewstate, viewstate_gen, start_date, end_date)

    print(f"\nSubmitting search...")
    response = scraper.scraper.post(scraper.base_url, data=form_data)

    if response.status_code != 200:
        print(f"ERROR: Search failed with status {response.status_code}")
        sys.exit(1)

    # Save the raw HTML to a file
    output_file = Path(__file__).parent.parent / "data" / "debug_response.html"
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(response.text)

    print(f"✅ Saved response to: {output_file}")

    # Check what's in the response
    soup = __import__('bs4').BeautifulSoup(response.text, "html.parser")

    # Find the results table
    table = soup.find("table", {"class": "tabular-data"})

    if not table:
        print("\n❌ NO TABLE FOUND IN RESPONSE")
        print("Response might be empty or have different structure")

        # Check for error messages
        error_div = soup.find("div", {"class": "error"})
        if error_div:
            print(f"Error message: {error_div.get_text(strip=True)}")
    else:
        print(f"\n✅ Found results table")

        tbody = table.find("tbody")
        if tbody:
            rows = tbody.find_all("tr")
            print(f"Number of <tr> rows: {len(rows)}")

            # Check for pagination
            pagination = soup.find_all(string=lambda text: text and ('Page' in text or 'page' in text))
            if pagination:
                print(f"\n⚠️  PAGINATION DETECTED:")
                for p in pagination:
                    print(f"  {p.strip()}")

            # Look for page size selector
            page_size = soup.find("select", {"name": lambda x: x and "PageSize" in x})
            if page_size:
                print(f"\n⚠️  PAGE SIZE SELECTOR FOUND:")
                options = page_size.find_all("option")
                for opt in options:
                    selected = " (SELECTED)" if opt.get("selected") else ""
                    print(f"  {opt.get('value')}: {opt.get_text(strip=True)}{selected}")

            # Check first few rows
            print(f"\nFirst 3 rows cell counts:")
            for i, row in enumerate(rows[:3]):
                cells = row.find_all("td")
                print(f"  Row {i+1}: {len(cells)} cells")
                if len(cells) >= 4:
                    print(f"    Parcel: {cells[1].get_text(strip=True)}")
                    print(f"    Address: {cells[3].get_text(strip=True)}")
        else:
            print("❌ Table has no tbody")

    # Now try the actual parser
    print(f"\n{'='*60}")
    print("Running actual parser...")
    print(f"{'='*60}")

    sales = scraper._parse_results(response.text)
    print(f"Parser extracted: {len(sales)} sales")

    if sales:
        print(f"\nFirst sale:")
        for key, value in list(sales[0].items())[:10]:
            print(f"  {key}: {value}")
