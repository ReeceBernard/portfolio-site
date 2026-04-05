/**
 * Local dev server — mimics API Gateway v2 by translating HTTP ↔ Lambda event format.
 * Run alongside `npm run dev` with:  npm run dev:api
 *
 * Env vars are loaded from .env.local (via `node --env-file=.env.local`).
 * Set IS_DEV=true in .env.local so CORS allows http://localhost:5173.
 */

import http from "http";
import { URL } from "url";

// Import handlers directly — tsx handles the TypeScript compilation
import { handler as analyzeProperty } from "../api/analyze-property";
import { handler as comps } from "../api/comps";
import { handler as callsRemaining } from "../api/calls-remaining";
import { handler as fredProxy } from "../api/fred-proxy";
import { handler as hudProxy } from "../api/hud-proxy";

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const PORT = 3000;

const ROUTES: Record<string, (e: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>> = {
  "/api/analyze-property": analyzeProperty,
  "/api/comps": comps,
  "/api/calls-remaining": callsRemaining,
  "/api/fred-proxy": fredProxy,
  "/api/hud-proxy": hudProxy,
};

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}

function buildEvent(
  req: http.IncomingMessage,
  body: string,
  parsed: URL
): APIGatewayProxyEventV2 {
  const qs: Record<string, string> = {};
  parsed.searchParams.forEach((v, k) => { qs[k] = v; });

  return {
    version: "2.0",
    routeKey: `${req.method} ${parsed.pathname}`,
    rawPath: parsed.pathname,
    rawQueryString: parsed.search.slice(1),
    headers: req.headers as Record<string, string>,
    queryStringParameters: Object.keys(qs).length ? qs : undefined,
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: "localhost",
      domainPrefix: "localhost",
      http: {
        method: req.method ?? "GET",
        path: parsed.pathname,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: req.headers["user-agent"] ?? "",
      },
      requestId: "local",
      routeKey: `${req.method} ${parsed.pathname}`,
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: body || undefined,
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const handler = ROUTES[parsed.pathname];

  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const body = await readBody(req);
  const event = buildEvent(req, body, parsed);

  const start = Date.now();
  try {
    const result = await handler(event);
    const { statusCode = 200, headers = {}, body: resBody = "" } = result as {
      statusCode?: number;
      headers?: Record<string, string>;
      body?: string;
    };
    console.log(`${req.method} ${parsed.pathname} → ${statusCode} (${Date.now() - start}ms)`);
    res.writeHead(statusCode, headers);
    res.end(resBody);
  } catch (err) {
    console.error(`${req.method} ${parsed.pathname} → 500`, err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`);
  console.log("Routes:", Object.keys(ROUTES).join(", "));
});
