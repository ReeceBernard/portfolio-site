import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const ALLOWED_ORIGIN = process.env.IS_DEV ? "http://localhost:5173" : "https://reecebernard.dev";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function ok(body: unknown): APIGatewayProxyResultV2 {
  return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
}
function err(status: number, msg: string): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ error: msg }) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (method !== "GET") return err(405, "Method not allowed");

  const series = event.queryStringParameters?.series;
  if (!series || typeof series !== "string") return err(400, "Missing series parameter");

  const allowedSeries = ["MORTGAGE15US", "MORTGAGE30US"];
  if (!allowedSeries.includes(series)) return err(400, "Unauthorized series");

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${process.env.FRED_API_KEY}&file_type=json&start_date=${startDate}&end_date=${endDate}&sort_order=desc&limit=1`;
    const fredResponse = await fetch(fredUrl);

    if (!fredResponse.ok) throw new Error(`FRED API error: ${fredResponse.status}`);

    const fredData = await fredResponse.json();
    if (!fredData.observations || fredData.observations.length === 0) throw new Error("No data available");

    const rate = parseFloat(fredData.observations[0].value);
    if (isNaN(rate)) throw new Error("Invalid rate data");

    return ok({ series, rate, date: fredData.observations[0].date, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("FRED Proxy Error:", error);
    const fallbackRates: Record<string, number> = { MORTGAGE15US: 6.81, MORTGAGE30US: 7.22 };
    return ok({
      series,
      rate: fallbackRates[series] ?? 7.0,
      date: endDate,
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
};
