const baseUrl = (process.env.SMOKE_URL ?? process.argv[2] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000);

async function check(path, validate) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  if (!validate(body)) throw new Error(`${path} returned unexpected content`);
  console.log(`OK ${response.status} ${path}`);
}

try {
  await check("/", (body) => body.includes("ГРОСС Бережливый Монтаж") && body.includes('id="root"'));
  await check("/login", (body) => body.includes('id="root"'));
  console.log(`Smoke test passed: ${baseUrl}`);
} catch (error) {
  console.error(`Smoke test failed for ${baseUrl}: ${error.message}`);
  process.exit(1);
}
