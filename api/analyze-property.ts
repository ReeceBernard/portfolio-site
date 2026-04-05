import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import Redis from "ioredis";
import { querySalesComps } from "./comps";
import type { SalesComp } from "./comps";

const DAILY_LIMIT = 100;

function todayKey() {
  return `analyze:daily:${new Date().toISOString().slice(0, 10)}`;
}

function getRedis() {
  const url = process.env.REDIS_URL ?? process.env.redis_REDIS_URL;
  if (!url) return null;
  return new Redis(url);
}

interface HudBasicData {
  zip_code: string;
  Efficiency: number;
  "One-Bedroom": number;
  "Two-Bedroom": number;
  "Three-Bedroom": number;
  "Four-Bedroom": number;
}

interface HudResponse {
  data?: { basicdata?: HudBasicData[] };
}

// Hard-coded GA county → HUD FIPS entity ID map (from fmr/listCounties/GA)
const GA_COUNTY_FIPS: Record<string, string> = {
  "appling": "1300199999", "atkinson": "1300399999", "bacon": "1300599999",
  "baker": "1300799999", "baldwin": "1300999999", "banks": "1301199999",
  "barrow": "1301399999", "bartow": "1301599999", "ben hill": "1301799999",
  "berrien": "1301999999", "bibb": "1302199999", "bleckley": "1302399999",
  "brantley": "1302599999", "brooks": "1302799999", "bryan": "1302999999",
  "bulloch": "1303199999", "burke": "1303399999", "butts": "1303599999",
  "calhoun": "1303799999", "camden": "1303999999", "candler": "1304399999",
  "carroll": "1304599999", "catoosa": "1304799999", "charlton": "1304999999",
  "chatham": "1305199999", "chattahoochee": "1305399999", "chattooga": "1305599999",
  "cherokee": "1305799999", "clarke": "1305999999", "clay": "1306199999",
  "clayton": "1306399999", "clinch": "1306599999", "cobb": "1306799999",
  "coffee": "1306999999", "colquitt": "1307199999", "columbia": "1307399999",
  "cook": "1307599999", "coweta": "1307799999", "crawford": "1307999999",
  "crisp": "1308199999", "dade": "1308399999", "dawson": "1308599999",
  "decatur": "1308799999", "dekalb": "1308999999", "dodge": "1309199999",
  "dooly": "1309399999", "dougherty": "1309599999", "douglas": "1309799999",
  "early": "1309999999", "echols": "1310199999", "effingham": "1310399999",
  "elbert": "1310599999", "emanuel": "1310799999", "evans": "1310999999",
  "fannin": "1311199999", "fayette": "1311399999", "floyd": "1311599999",
  "forsyth": "1311799999", "franklin": "1311999999", "fulton": "1312199999",
  "gilmer": "1312399999", "glascock": "1312599999", "glynn": "1312799999",
  "gordon": "1312999999", "grady": "1313199999", "greene": "1313399999",
  "gwinnett": "1313599999", "habersham": "1313799999", "hall": "1313999999",
  "hancock": "1314199999", "haralson": "1314399999", "harris": "1314599999",
  "hart": "1314799999", "heard": "1314999999", "henry": "1315199999",
  "houston": "1315399999", "irwin": "1315599999", "jackson": "1315799999",
  "jasper": "1315999999", "jeff davis": "1316199999", "jefferson": "1316399999",
  "jenkins": "1316599999", "johnson": "1316799999", "jones": "1316999999",
  "lamar": "1317199999", "lanier": "1317399999", "laurens": "1317599999",
  "lee": "1317799999", "liberty": "1317999999", "lincoln": "1318199999",
  "long": "1318399999", "lowndes": "1318599999", "lumpkin": "1318799999",
  "mcduffie": "1318999999", "mcintosh": "1319199999", "macon": "1319399999",
  "madison": "1319599999", "marion": "1319799999", "meriwether": "1319999999",
  "miller": "1320199999", "mitchell": "1320599999", "monroe": "1320799999",
  "montgomery": "1320999999", "morgan": "1321199999", "murray": "1321399999",
  "muscogee": "1321599999", "newton": "1321799999", "oconee": "1321999999",
  "oglethorpe": "1322199999", "paulding": "1322399999", "peach": "1322599999",
  "pickens": "1322799999", "pierce": "1322999999", "pike": "1323199999",
  "polk": "1323399999", "pulaski": "1323599999", "putnam": "1323799999",
  "quitman": "1323999999", "rabun": "1324199999", "randolph": "1324399999",
  "richmond": "1324599999", "rockdale": "1324799999", "schley": "1324999999",
  "screven": "1325199999", "seminole": "1325399999", "spalding": "1325599999",
  "stephens": "1325799999", "stewart": "1325999999", "sumter": "1326199999",
  "talbot": "1326399999", "taliaferro": "1326599999", "tattnall": "1326799999",
  "taylor": "1326999999", "telfair": "1327199999", "terrell": "1327399999",
  "thomas": "1327599999", "tift": "1327799999", "toombs": "1327999999",
  "towns": "1328199999", "treutlen": "1328399999", "troup": "1328599999",
  "turner": "1328799999", "twiggs": "1328999999", "union": "1329199999",
  "upson": "1329399999", "walker": "1329599999", "walton": "1329799999",
  "ware": "1329999999", "warren": "1330199999", "washington": "1330399999",
  "wayne": "1330599999", "webster": "1330799999", "wheeler": "1330999999",
  "white": "1331199999", "whitfield": "1331399999", "wilcox": "1331599999",
  "wilkes": "1331799999", "wilkinson": "1331999999", "worth": "1332199999",
};

async function fetchPropertySearchContext(address: string): Promise<string | null> {
  const query = `${address} property details beds baths square feet year built`;
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; property-analyzer/1.0)",
        "Accept": "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim();

    const PROPERTY_RE = /bed|bath|sq\s*ft|square\s*f|year\s*built|built\s*in\s*\d{4}|lot\s*size|acres|garage|stories|storey|floor\s*plan|sqft/i;
    const segments = text
      .split(/(?<=[.!?])\s+|(?<=\d)\s*·\s*|\s{3,}/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 400 && PROPERTY_RE.test(s));

    if (segments.length === 0) return null;
    return segments.join(" | ").slice(0, 2000);
  } catch {
    return null;
  }
}

async function fetchHudFmr(county: string, zip?: string): Promise<{ data: HudBasicData; year: number } | null> {
  const apiKey = process.env.HUD_API_KEY;
  if (!apiKey) {
    console.warn("[analyze-property] HUD: HUD_API_KEY not set");
    return null;
  }

  const entityId = GA_COUNTY_FIPS[county.toLowerCase()];
  if (!entityId) {
    console.warn(`[analyze-property] HUD: no FIPS found for county="${county}"`);
    return null;
  }
  console.log(`[analyze-property] HUD: county="${county}" zip=${zip} entityId=${entityId}`);

  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear - 1, currentYear - 2, currentYear - 3];

  for (const year of yearsToTry) {
    try {
      const res = await fetch(
        `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}?year=${year}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!res.ok) {
        console.warn(`[analyze-property] HUD: year=${year} → HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as HudResponse;
      const rows = json?.data?.basicdata;
      if (!rows?.length) {
        console.warn(`[analyze-property] HUD: year=${year} → no basicdata rows`);
        continue;
      }
      // Prefer zip-specific row, fall back to MSA level
      const entry = (zip ? rows.find(r => r.zip_code === zip) : null)
        ?? rows.find(r => r.zip_code === "MSA level")
        ?? rows[0];
      console.log(`[analyze-property] HUD: year=${year} using zip_code="${entry.zip_code}" (${rows.length} rows available) — studio=$${entry.Efficiency} 1br=$${entry["One-Bedroom"]} 2br=$${entry["Two-Bedroom"]} 3br=$${entry["Three-Bedroom"]}`);
      return { data: entry, year };
    } catch (e) {
      console.warn(`[analyze-property] HUD: year=${year} threw: ${e}`);
      continue;
    }
  }
  console.error(`[analyze-property] HUD: all years failed for county="${county}"`);
  return null;
}

const ALLOWED_ORIGIN = process.env.IS_DEV ? "http://localhost:5173" : "https://reecebernard.dev";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function err(status: number, body: object): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (method !== "POST") return err(405, { error: "Method not allowed" });

  const { address, lat, lon } = JSON.parse(event.body ?? "{}") as {
    address?: string;
    lat?: number;
    lon?: number;
  };

  if (!address || lat == null || lon == null) {
    return err(400, { error: "Missing address, lat, or lon" });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return err(500, { error: "Anthropic API key not configured" });

  // Rate limiting
  const redis = getRedis();
  let callsRemaining = DAILY_LIMIT - 1;
  if (redis) {
    try {
      const key = todayKey();
      const count = await redis.incr(key);
      await redis.expire(key, 172800);
      if (count > DAILY_LIMIT) {
        redis.disconnect();
        return err(429, { error: "Daily analysis limit reached. Try again tomorrow.", callsRemaining: 0 });
      }
      callsRemaining = DAILY_LIMIT - count;
    } finally {
      redis.disconnect();
    }
  }

  const zip = address.match(/\b(\d{5})\b/)?.[1];
  const county = address.match(/([\w]+(?:\s[\w]+)*)\s+County\b/i)?.[1]?.toLowerCase().trim();
  console.log(`[analyze-property] address="${address}" zip=${zip} county=${county} lat=${lat} lon=${lon}`);

  const [hudResult, searchContext, realSalesComps] = await Promise.all([
    county ? fetchHudFmr(county, zip) : Promise.resolve(null),
    fetchPropertySearchContext(address),
    county
      ? querySalesComps(county, lat, lon).then(
          (rows) => { console.log(`[analyze-property] comps: ${rows.length} rows for county=${county}`); return rows; },
          (err) => { console.error(`[analyze-property] comps query failed:`, err); return [] as SalesComp[]; }
        )
      : Promise.resolve([] as SalesComp[]),
  ]);

  console.log(`[analyze-property] context ready — hud=${hudResult ? `year=${hudResult.year}` : "null"} searchContext=${searchContext ? `${searchContext.length}chars` : "null"} salesComps=${realSalesComps.length}`);

  const hudContext = hudResult
    ? `\nHUD Fair Market Rents for ${county} county (${hudResult.year} data):
- Studio: $${hudResult.data.Efficiency}/mo
- 1BR: $${hudResult.data["One-Bedroom"]}/mo
- 2BR: $${hudResult.data["Two-Bedroom"]}/mo
- 3BR: $${hudResult.data["Three-Bedroom"]}/mo
- 4BR: $${hudResult.data["Four-Bedroom"]}/mo

Use these as anchors for your rent estimates. Your rentRanges and comp monthlyRent values should be consistent with these HUD figures.\n`
    : "";

  const salesCompsContext = realSalesComps.length > 0
    ? `\nNearby sales from county deed records for ${county} county (last 3 years, sorted by proximity to subject) — select the 6-8 most comparable to the subject property based on bedroom count, bathroom count, and square footage. Use the selected entries exactly as provided (address, price, date, beds, baths, lat/lon) — do not modify or substitute:\n${
        realSalesComps.map(c =>
          `- ${c.address} | sold ${c.sale_date} for $${c.sale_price.toLocaleString()}` +
          (c.square_ft ? ` | ${c.square_ft} sqft` : "") +
          (c.price_per_sqft ? ` ($${c.price_per_sqft}/sqft)` : "") +
          (c.property_type ? ` | ${c.property_type}` : "") +
          (c.bedrooms != null ? ` | ${c.bedrooms} bed` : "") +
          (c.bathrooms != null ? ` | ${c.bathrooms} bath` : "") +
          (c.lat != null && c.lon != null ? ` | lat=${c.lat} lon=${c.lon}` : "")
        ).join("\n")
      }\n`
    : "";

  const system = `You are a real estate data analyst. Given a US property address and its coordinates, return rental market analysis as raw JSON only — no markdown, no code fences, no explanation. Be precise and consistent: the same property analyzed twice should produce very similar numbers.`;

  const searchSection = searchContext
    ? `\nWeb search results for this property — these are from Zillow, Redfin, Trulia and public records and are accurate. You MUST use these values for the subjectProperty fields. Do not substitute your own estimates for any field that appears in these results:\n---\n${searchContext}\n---\n`
    : "";

  const user = `Analyze this US rental property:
Address: ${address}
Coordinates: ${lat}, ${lon}
${searchSection}${hudContext}${salesCompsContext}
Return a JSON object with this exact shape:
{
  "subjectProperty": {
    "bedrooms": <number or null>,
    "bathrooms": <number or null>,
    "squareFeet": <number or null, interior living area — use the search results value exactly if present>,
    "lotSizeSqFt": <number or null, lot/yard size in square feet>,
    "yearBuilt": <number or null, year the home was built — use the search results value exactly if present>,
    "propertyType": <string or null, e.g. "Single Family", "Condo", "Townhouse", "Multi-Family">,
    "zoning": <string or null, e.g. "R-1", "R-2", "MF-1" — use your best estimate from training data>
  },
  "estimatedValue": <number, estimated market value in USD>,
  "rentRanges": {
    "conservative": <number, monthly rent for a below-market lease — a realistic low end a landlord might actually achieve, not a worst-case outlier>,
    "median": <number, the most likely monthly rent this property would lease for today based on current comps>,
    "optimistic": <number, monthly rent for a well-presented unit in peak season — realistic high end, not an aspirational stretch>
  },
  "salesComps": [
    {
      "address": <string, full street address including house number — must be a real address, do not fabricate>,
      "lat": <number, latitude — must be accurate to 4 decimal places and within 0.5 miles of the subject>,
      "lon": <number, longitude — must be accurate to 4 decimal places and within 0.5 miles of the subject>,
      "bedrooms": <number or null>,
      "bathrooms": <number or null>,
      "salePrice": <number, sale price in USD>,
      "squareFeet": <number or null>,
      "saleDate": <string or null, YYYY-MM of the sale — use your best estimate from training data, null if unknown>
    }
  ],
  "summary": <string, 2-3 sentence market summary>
}

Requirements:
- For salesComps: if deed record data was provided above, select the 6-8 most comparable entries based on bedroom count, bathroom count, and square footage similarity to the subject. Use those entries exactly — do not modify addresses, prices, dates, or coordinates. If no deed records were provided, generate 3-5 real nearby sales from your training data
- All comp addresses must be real streets that exist near the subject — do not invent addresses
- Comp lat/lon must be geographically accurate and within 0.5 miles of the subject coordinates
- The three rent tiers must be tightly clustered: conservative and optimistic within 10-15% of median — not a wide spread
- For saleDate, use the value from the deed records exactly`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      const msg = (errData as { error?: { message?: string } }).error?.message ?? `Anthropic API error ${anthropicRes.status}`;
      return err(502, { error: msg });
    }

    const data = await anthropicRes.json();
    const rawText: string = data.content?.[0]?.text ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const result = JSON.parse(cleaned);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({
      ...result,
      hudFmr: hudResult ? { ...hudResult.data, year: hudResult.year } : null,
      callsRemaining,
    }) };
  } catch (error) {
    console.error("analyze-property error:", error);
    const msg = error instanceof SyntaxError
      ? "Claude returned invalid JSON. Please try again."
      : "Analysis failed. Please try again.";
    return err(500, { error: msg });
  }
};
