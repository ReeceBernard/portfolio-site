import type { ClaudeAnalysisResult, ResolvedAddress } from "../types";

function getProxyBase() {
  return import.meta.env.DEV
    ? "http://localhost:3000"
    : import.meta.env.VITE_API_BASE_URL;
}

export async function analyzeProperty(
  address: ResolvedAddress,
): Promise<{ result: ClaudeAnalysisResult; callsRemaining: number }> {
  const response = await fetch(`${getProxyBase()}/api/analyze-property`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: address.displayName,
      lat: address.lat,
      lon: address.lon,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (body as { error?: string }).error || `API error ${response.status}`,
    );
  }

  const { callsRemaining, ...result } = body as ClaudeAnalysisResult & { callsRemaining: number };

  return { result: result as ClaudeAnalysisResult, callsRemaining: callsRemaining ?? 0 };
}

export async function fetchCallsRemaining(): Promise<number> {
  try {
    const res = await fetch(`${getProxyBase()}/api/calls-remaining`);
    if (!res.ok) return 100;
    const data = await res.json() as { callsRemaining: number };
    return data.callsRemaining;
  } catch {
    return 100;
  }
}

