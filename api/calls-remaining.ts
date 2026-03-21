import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const DAILY_LIMIT = 100;

function todayKey() {
  return `analyze:daily:${new Date().toISOString().slice(0, 10)}`;
}

const ALLOWED_ORIGIN = process.env.__VERCEL_DEV_RUNNING
  ? "http://localhost:5173"
  : "https://reecebernard.dev";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const redisUrl = process.env.REDIS_URL ?? process.env.redis_REDIS_URL;
  if (!redisUrl) {
    return res
      .status(200)
      .json({ callsRemaining: DAILY_LIMIT, limit: DAILY_LIMIT, used: 0 });
  }

  const redis = new Redis(redisUrl);
  try {
    const raw = await redis.get(todayKey());
    const used = raw ? parseInt(raw, 10) : 0;
    const callsRemaining = Math.max(0, DAILY_LIMIT - used);
    return res.status(200).json({ callsRemaining, limit: DAILY_LIMIT, used });
  } finally {
    redis.disconnect();
  }
}
