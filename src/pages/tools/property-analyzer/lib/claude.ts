import type { ClaudeAnalysisResult, ResolvedAddress } from "../types";

export async function analyzeProperty(
  address: ResolvedAddress,
  apiKey: string,
): Promise<ClaudeAnalysisResult> {
  const system = `You are a real estate data analyst. Given a US property address and its coordinates, return rental market analysis as raw JSON only — no markdown, no code fences, no explanation.`;

  const user = `Analyze this US rental property:
Address: ${address.displayName}
Coordinates: ${address.lat}, ${address.lon}

Return a JSON object with this exact shape:
{
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `API error ${response.status}`,
    );
  }

  const data = await response.json();
  const rawText: string = data.content?.[0]?.text ?? "";

  // Strip markdown fences defensively
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    const result = JSON.parse(cleaned) as ClaudeAnalysisResult;
    // Cache for dev testing — load with loadCachedAnalysis()
    localStorage.setItem(
      'property-analyzer-last-response',
      JSON.stringify({ address, result, savedAt: new Date().toISOString() })
    );
    return result;
  } catch {
    throw new Error("Claude returned invalid JSON. Please try again.");
  }
}

export interface CachedAnalysis {
  address: ResolvedAddress;
  result: ClaudeAnalysisResult;
  savedAt: string;
}

export function loadCachedAnalysis(): CachedAnalysis | null {
  try {
    const raw = localStorage.getItem('property-analyzer-last-response');
    if (!raw) return null;
    return JSON.parse(raw) as CachedAnalysis;
  } catch {
    return null;
  }
}
