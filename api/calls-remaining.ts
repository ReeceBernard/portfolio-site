import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import Redis from "ioredis";

const DAILY_LIMIT = 100;

function todayKey() {
  return `analyze:daily:${new Date().toISOString().slice(0, 10)}`;
}

const ALLOWED_ORIGIN = process.env.IS_DEV ? "http://localhost:5173" : "https://reecebernard.dev";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (method !== "GET") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const redisUrl = process.env.REDIS_URL ?? process.env.redis_REDIS_URL;
  if (!redisUrl) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ callsRemaining: DAILY_LIMIT, limit: DAILY_LIMIT, used: 0 }) };
  }

  const redis = new Redis(redisUrl);
  try {
    const raw = await redis.get(todayKey());
    const used = raw ? parseInt(raw, 10) : 0;
    const callsRemaining = Math.max(0, DAILY_LIMIT - used);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ callsRemaining, limit: DAILY_LIMIT, used }) };
  } finally {
    redis.disconnect();
  }
};
