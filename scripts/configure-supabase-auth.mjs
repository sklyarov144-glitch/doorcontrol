import {
  authConfigurationEndpoint,
  buildHostedAuthConfiguration,
  verifyHostedAuthConfiguration,
} from "../src/services/supabase/authConfiguration.js";

const apply = process.argv.includes("--apply");
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef = process.env.SUPABASE_PROJECT_ID?.trim();
const appPublicUrl = process.env.APP_PUBLIC_URL?.trim();

const missing = [
  ["SUPABASE_ACCESS_TOKEN", accessToken],
  ["SUPABASE_PROJECT_ID", projectRef],
  ["APP_PUBLIC_URL", appPublicUrl],
].filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error(`Missing environment values: ${missing.join(", ")}`);

const endpoint = authConfigurationEndpoint(projectRef);
const expected = buildHostedAuthConfiguration(appPublicUrl);
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

async function request(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`Supabase Auth config ${method} failed (${response.status}): ${message}`);
  }
  return response.json();
}

if (apply) {
  await request("PATCH", expected);
  console.log(`Applied hosted Auth configuration to project ${projectRef}.`);
} else {
  console.log("Check-only mode. Pass --apply to update hosted Auth configuration.");
}

const actual = await request("GET");
const verification = verifyHostedAuthConfiguration(actual, expected);
if (!verification.valid) {
  const drift = verification.mismatches.map(({ key, expected: wanted, actual: found }) => (
    `${key}: expected ${JSON.stringify(wanted)}, received ${JSON.stringify(found)}`
  ));
  throw new Error(`Hosted Auth configuration drift detected: ${drift.join("; ")}`);
}
console.log("Hosted Auth configuration verification passed: signup disabled, email login enabled, redirects matched.");
