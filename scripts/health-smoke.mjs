const url = process.env.SUPABASE_URL?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
if (!url || !anonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for health smoke");
}

const endpoint = new URL("/functions/v1/health", url);
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

try {
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    signal: controller.signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== "ok" || body?.database !== "ok") {
    throw new Error(`Health endpoint is unavailable (HTTP ${response.status})`);
  }
  if (!Number.isFinite(body.latencyMs) || body.latencyMs < 0) {
    throw new Error("Health endpoint returned an invalid latency");
  }
  console.log(`Backend health smoke passed in ${body.latencyMs} ms.`);
} finally {
  clearTimeout(timeout);
}
