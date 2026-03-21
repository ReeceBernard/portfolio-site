import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGIN = process.env.__VERCEL_DEV_RUNNING
  ? "http://localhost:5173"
  : "https://reecebernard.dev";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { zip, year } = req.query;

  if (!zip || typeof zip !== 'string') {
    return res.status(400).json({ error: 'Missing zip parameter' });
  }

  const apiKey = process.env.HUD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'HUD API key not configured' });

  // Default to most recent available year
  const targetYear = year ?? new Date().getFullYear() - 1;

  try {
    const url = `https://www.huduser.gov/hudapi/public/fmr/data/${zip}?year=${targetYear}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`HUD API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('HUD Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch HUD data' });
  }
}
