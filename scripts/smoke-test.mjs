import { assertSameOriginResponse, validateSpaDocument } from "../src/services/smokeValidation.js";

const baseUrl = (process.env.SMOKE_URL ?? process.argv[2] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000);
const requireSecurityHeaders = process.env.SMOKE_REQUIRE_SECURITY_HEADERS === "true";
const expectedRelease = process.env.SMOKE_EXPECT_RELEASE?.trim() ?? "";
const retries = Number(process.env.SMOKE_RETRIES ?? 1);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 5_000);

function validateSecurityHeaders(response) {
  const required = {
    "content-security-policy": "default-src 'self'",
    "strict-transport-security": "max-age=63072000",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "cross-origin-opener-policy": "same-origin",
  };
  for (const [name, expected] of Object.entries(required)) {
    const value = response.headers.get(name) ?? "";
    if (!value.includes(expected)) throw new Error(`${name} header is missing or invalid`);
  }
}

async function check(path, validate) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const requestUrl = `${baseUrl}${path}`;
      const response = await fetch(requestUrl, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
      const body = await response.text();
      assertSameOriginResponse(requestUrl, response.url);
      if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
      if (!validate(body, response)) throw new Error(`${path} returned unexpected content or stale release`);
      if (requireSecurityHeaders) validateSecurityHeaders(response);
      console.log(`OK ${response.status} ${path}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastError;
}

try {
  await check("/", (body) => validateSpaDocument(body, expectedRelease));
  await check("/login", (body) => validateSpaDocument(body, expectedRelease));
  console.log(`Smoke test passed: ${baseUrl}`);
} catch (error) {
  console.error(`Smoke test failed for ${baseUrl}: ${error.message}`);
  process.exit(1);
}
