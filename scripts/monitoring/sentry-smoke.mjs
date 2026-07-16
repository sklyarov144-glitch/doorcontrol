import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createSentrySmokeEnvelope, parseSentryDsn } from "../../src/services/monitoring/sentryEnvelope.js";

const optional = process.argv.includes("--optional");
const dsn = process.env.SENTRY_DSN ?? process.env.VITE_SENTRY_DSN ?? "";
const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.DEPLOY_ENV ?? "staging";
const release = process.env.SENTRY_RELEASE ?? process.env.RELEASE_SHA ?? "local";
const evidencePath = process.env.SENTRY_EVIDENCE_PATH ?? "sentry-smoke-evidence.json";
const timestamp = new Date().toISOString();

async function saveEvidence(evidence) {
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

if (!dsn) {
  const evidence = { configured: false, environment, release, checkedAt: timestamp };
  await saveEvidence(evidence);
  if (optional) {
    console.warn(`Sentry smoke skipped: VITE_SENTRY_DSN is not configured for ${environment}.`);
    process.exit(0);
  }
  throw new Error(`Sentry smoke failed: VITE_SENTRY_DSN is required for ${environment}.`);
}

const parsed = parseSentryDsn(dsn);
const eventId = randomUUID().replaceAll("-", "");
const envelope = createSentrySmokeEnvelope({ dsn, environment, release, eventId, timestamp });
const response = await fetch(parsed.envelopeUrl, {
  method: "POST",
  headers: { "content-type": "application/x-sentry-envelope" },
  body: envelope,
  signal: AbortSignal.timeout(15_000),
});

const evidence = {
  configured: true,
  accepted: response.ok,
  environment,
  release,
  eventId,
  projectId: parsed.projectId,
  checkedAt: timestamp,
  httpStatus: response.status,
};
await saveEvidence(evidence);

if (!response.ok) {
  const details = (await response.text()).slice(0, 500);
  throw new Error(`Sentry rejected smoke event (${response.status}): ${details}`);
}

console.log(`Sentry accepted smoke event ${eventId} for ${environment} release ${release}.`);
