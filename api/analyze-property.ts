import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

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
  Efficiency: number;
  "One-Bedroom": number;
  "Two-Bedroom": number;
  "Three-Bedroom": number;
  "Four-Bedroom": number;
  year: number;
}

interface HudResponse {
  data?: { basicdata?: HudBasicData };
}

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

async function fetchHudFmr(
  zip: string,
): Promise<{ data: HudBasicData; year: number } | null> {
  const apiKey = process.env.HUD_API_KEY;
  if (!apiKey) return null;

  const year = new Date().getFullYear() - 1;
  try {
    const res = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${zip}?year=${year}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as HudResponse;
    const basicdata = json?.data?.basicdata;
    if (!basicdata) return null;
    return { data: basicdata, year: basicdata.year ?? year };
  } catch {
    return null;
  }
}

const ALLOWED_ORIGIN = process.env.__VERCEL_DEV_RUNNING
  ? "http://localhost:5173"
  : "https://reecebernard.dev";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { address, lat, lon } = req.body as {
    address?: string;
    lat?: number;
    lon?: number;
  };

  if (!address || lat == null || lon == null) {
    return res.status(400).json({ error: "Missing address, lat, or lon" });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey)
    return res.status(500).json({ error: "Anthropic API key not configured" });

  // Rate limiting
  const redis = getRedis();
  let callsRemaining = DAILY_LIMIT - 1;
  if (redis) {
    try {
      const key = todayKey();
      const count = await redis.incr(key);
      await redis.expire(key, 172800); // expire after 2 days
      if (count > DAILY_LIMIT) {
        redis.disconnect();
        return res.status(429).json({ error: "Daily analysis limit reached. Try again tomorrow.", callsRemaining: 0 });
      }
      callsRemaining = DAILY_LIMIT - count;
    } finally {
      redis.disconnect();
    }
  }

  // Extract zip from address string
  const zip = address.match(/\b(\d{5})\b/)?.[1];

  // Fetch in parallel: HUD FMR data + DDG property search
  const [hudResult, searchContext] = await Promise.all([
    zip ? fetchHudFmr(zip) : Promise.resolve(null),
    fetchPropertySearchContext(address),
  ]);

  const hudContext = hudResult
    ? `\nHUD Fair Market Rents for zip ${zip} (${hudResult.year} data):
- Studio: $${hudResult.data.Efficiency}/mo
- 1BR: $${hudResult.data["One-Bedroom"]}/mo
- 2BR: $${hudResult.data["Two-Bedroom"]}/mo
- 3BR: $${hudResult.data["Three-Bedroom"]}/mo
- 4BR: $${hudResult.data["Four-Bedroom"]}/mo

Use these as anchors for your rent estimates. Your rentRanges and comp monthlyRent values should be consistent with these HUD figures.\n`
    : "";

  const system = `You are a real estate data analyst. Given a US property address and its coordinates, return rental market analysis as raw JSON only — no markdown, no code fences, no explanation.`;

  const searchSection = searchContext
    ? `\nWeb search results for this property (extract beds, baths, sqft, year built, lot size, property type from this — prefer these over your training data for the subjectProperty fields):\n---\n${searchContext}\n---\n`
    : "";

  const user = `Analyze this US rental property:
Address: ${address}
Coordinates: ${lat}, ${lon}
${searchSection}${hudContext}
Return a JSON object with this exact shape:
{
  "subjectProperty": {
    "bedrooms": <number or null>,
    "bathrooms": <number or null>,
    "squareFeet": <number or null, interior living area>,
    "lotSizeSqFt": <number or null, lot/yard size in square feet>,
    "yearBuilt": <number or null, year the home was built>,
    "propertyType": <string or null, e.g. "Single Family", "Condo", "Townhouse", "Multi-Family">,
    "zoning": <string or null, e.g. "R-1", "R-2", "MF-1" — use your best estimate from training data>
  },
  "estimatedValue": <number, estimated market value in USD>,
  "rentRanges": {
    "conservative": <number, monthly rent for a below-market lease — a realistic low end a landlord might actually achieve, not a worst-case outlier>,
    "median": <number, the most likely monthly rent this property would lease for today based on current comps>,
    "optimistic": <number, monthly rent for a well-presented unit in peak season — realistic high end, not an aspirational stretch>
  },
  "comps": [
    {
      "address": <string, full street address>,
      "lat": <number, latitude>,
      "lon": <number, longitude>,
      "bedrooms": <number>,
      "bathrooms": <number>,
      "monthlyRent": <number>,
      "squareFeet": <number or null>,
      "listingDate": <string or null, YYYY-MM of when this rental was listed or leased — use your best estimate from training data, null if unknown>
    }
  ],
  "salesComps": [
    {
      "address": <string, full street address>,
      "lat": <number, latitude>,
      "lon": <number, longitude>,
      "bedrooms": <number>,
      "bathrooms": <number>,
      "salePrice": <number, sale price in USD>,
      "squareFeet": <number or null>,
      "saleDate": <string or null, YYYY-MM of the sale — use your best estimate from training data, null if unknown>
    }
  ],
  "summary": <string, 2-3 sentence market summary>
}

Requirements:
- Provide 4-6 rental comps within ~0.5 mile radius of the subject property, same property type
- Provide 3-5 recent sales comps within ~0.5 mile radius, same property type — these inform what to pay for the home
- Each comp must have accurate lat/lon coordinates near the subject
- Base all rent estimates on current market data; the three rent tiers should be tightly clustered (conservative and optimistic within ~10-15% of median), not a wide spread
- The comps' monthlyRent values should be consistent with and inform the rentRanges above
- For listingDate and saleDate, provide the actual or estimated YYYY-MM. Prefer recent data; always include the date so users know the data age`;

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
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      const msg =
        (err as { error?: { message?: string } }).error?.message ||
        `Anthropic API error ${anthropicRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const data = await anthropicRes.json();
    const rawText: string = data.content?.[0]?.text ?? "";

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const result = JSON.parse(cleaned);
    return res.status(200).json({ ...result, callsRemaining });
  } catch (error) {
    console.error("analyze-property error:", error);
    const msg =
      error instanceof SyntaxError
        ? "Claude returned invalid JSON. Please try again."
        : "Analysis failed. Please try again.";
    return res.status(500).json({ error: msg });
  }
}
