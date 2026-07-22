import { createClient } from "@supabase/supabase-js";

const url = (process.env.AUTH_SMOKE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim();
const anonKey = (process.env.AUTH_SMOKE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY)?.trim();
const email = process.env.AUTH_SMOKE_ITR_EMAIL?.trim();
const password = process.env.AUTH_SMOKE_ITR_PASSWORD;
if (!url || !anonKey || !email || !password) {
  throw new Error("Authenticated ITR smoke credentials are required");
}

const requests = Number(process.env.DOMAIN_LOAD_REQUESTS ?? 200);
const concurrency = Number(process.env.DOMAIN_LOAD_CONCURRENCY ?? 20);
const p95Limit = Number(process.env.DOMAIN_LOAD_P95_LIMIT_MS ?? 2500);
if (!Number.isInteger(requests) || requests < 1 || requests > 5000) throw new Error("Invalid request count");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) throw new Error("Invalid concurrency");

const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { error: authError } = await client.auth.signInWithPassword({ email, password });
if (authError) throw new Error(`ITR sign-in failed: ${authError.message}`);

const tables = ["objects", "buildings", "floors", "doors", "tasks", "document_items"];
const timings = [];
const errors = [];
let next = 0;

async function worker() {
  while (next < requests) {
    const index = next++;
    const table = tables[index % tables.length];
    const started = performance.now();
    const { error } = await client.from(table).select("id").range(0, 99);
    timings.push(performance.now() - started);
    if (error) errors.push(`${table}: ${error.message}`);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
await client.auth.signOut();
timings.sort((left, right) => left - right);
const p95 = timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.95))];
const result = {
  requests,
  concurrency,
  failures: errors.length,
  p50Ms: Math.round(timings[Math.floor(timings.length * 0.5)]),
  p95Ms: Math.round(p95),
  tables,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) throw new Error(`Domain load smoke failed: ${errors.slice(0, 3).join("; ")}`);
if (result.p95Ms > p95Limit) throw new Error(`Domain p95 ${result.p95Ms}ms exceeds ${p95Limit}ms`);
