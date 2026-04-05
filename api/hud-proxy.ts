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

  const { zip, year } = event.queryStringParameters ?? {};
  if (!zip) return err(400, "Missing zip parameter");

  const apiKey = process.env.HUD_API_KEY;
  if (!apiKey) return err(500, "HUD API key not configured");

  const targetYear = year ?? String(new Date().getFullYear() - 1);

  try {
    const response = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${zip}?year=${targetYear}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!response.ok) throw new Error(`HUD API error: ${response.status}`);
    const data = await response.json();
    return ok(data);
  } catch (error) {
    console.error("HUD Proxy Error:", error);
    return err(500, "Failed to fetch HUD data");
  }
};
