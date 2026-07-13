const baseUrl = (process.env.LOAD_URL ?? process.argv[2] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const requests = Number(process.env.LOAD_REQUESTS ?? 100);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
const timings = [];
let failures = 0;
let next = 0;

async function worker() {
  while (next < requests) {
    const index = next++;
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${index % 2 ? "/login" : "/"}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    }
    timings.push(performance.now() - started);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
timings.sort((a, b) => a - b);
const percentile = (ratio) => timings[Math.min(timings.length - 1, Math.floor(timings.length * ratio))];
const result = { baseUrl, requests, concurrency, failures, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)) };
console.log(JSON.stringify(result, null, 2));
if (failures > 0 || result.p95Ms > Number(process.env.LOAD_P95_LIMIT_MS ?? 2000)) process.exit(1);
