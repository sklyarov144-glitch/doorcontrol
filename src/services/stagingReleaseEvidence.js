function requireHttpsUrl(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (url.protocol !== "https:") throw new Error(`${field} must use HTTPS`);
  return url.href;
}

export function createStagingReleaseEvidence(input) {
  if (!/^[0-9a-f]{40}$/i.test(input.releaseSha ?? "")) {
    throw new Error("releaseSha must be a full commit SHA");
  }
  if (!/^[a-z0-9]{20}$/.test(input.supabaseProjectId ?? "")) {
    throw new Error("supabaseProjectId is invalid");
  }
  if (!Number.isFinite(Date.parse(input.deployedAt))) throw new Error("deployedAt must be a timestamp");

  const sourceCiRunId = String(input.sourceCiRunId ?? "").trim();
  const sentry = input.sentryEvidence ?? {};
  if (sentry.release !== input.releaseSha || sentry.environment !== "staging") {
    throw new Error("Sentry evidence does not match the staging release");
  }
  if (sentry.configured && !sentry.accepted) throw new Error("Configured Sentry smoke was not accepted");

  const checks = {
    applicationCi: "passed",
    databaseMigrations: "passed",
    hostedAuth: "passed",
    edgeFunctions: "passed",
    backendHealth: "passed",
    productionBundle: "passed",
    canonicalUrlSmoke: "passed",
    fourRoleAuthSmoke: "passed",
    fourRoleUiSmoke: "passed",
    authenticatedDomainLoad: "passed",
    sentryIngestion: sentry.configured ? "passed" : "not_configured",
  };
  const productionEligibilityReasons = [];
  if (!sourceCiRunId) productionEligibilityReasons.push("missing_source_ci");
  if (checks.sentryIngestion !== "passed") productionEligibilityReasons.push("sentry_not_verified");
  const productionEligible = productionEligibilityReasons.length === 0;

  return {
    schemaVersion: 1,
    environment: "staging",
    releaseSha: input.releaseSha.toLowerCase(),
    deployedAt: input.deployedAt,
    deployedBy: input.deployedBy,
    repository: input.repository,
    githubRunId: String(input.githubRunId),
    githubRunUrl: requireHttpsUrl(input.githubRunUrl, "githubRunUrl"),
    sourceCiRunId: sourceCiRunId || null,
    sourceCiRunUrl: sourceCiRunId ? requireHttpsUrl(input.sourceCiRunUrl, "sourceCiRunUrl") : null,
    productionEligible,
    productionEligibilityReasons,
    supabaseProjectId: input.supabaseProjectId,
    deployUrl: requireHttpsUrl(input.deployUrl, "deployUrl"),
    canonicalUrl: requireHttpsUrl(input.canonicalUrl, "canonicalUrl"),
    checks,
    sentry: sentry.configured
      ? { configured: true, eventId: sentry.eventId, projectId: sentry.projectId, checkedAt: sentry.checkedAt }
      : { configured: false, checkedAt: sentry.checkedAt },
  };
}

export const requiredStagingReleaseChecks = [
  "applicationCi", "databaseMigrations", "hostedAuth", "edgeFunctions", "backendHealth",
  "productionBundle", "canonicalUrlSmoke", "fourRoleAuthSmoke", "fourRoleUiSmoke",
  "authenticatedDomainLoad", "sentryIngestion",
];

export function validateStagingReleaseEvidence(evidence, expected = {}) {
  const errors = [];
  if (evidence?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (evidence?.environment !== "staging") errors.push("environment must be staging");
  if (!/^[0-9a-f]{40}$/i.test(evidence?.releaseSha ?? "")) errors.push("releaseSha must be a full commit SHA");
  if (expected.releaseSha && evidence?.releaseSha?.toLowerCase() !== expected.releaseSha.toLowerCase()) {
    errors.push("releaseSha does not match the requested production release");
  }
  if (expected.githubRunId && String(evidence?.githubRunId) !== String(expected.githubRunId)) {
    errors.push("githubRunId does not match the verified staging run");
  }
  if (expected.githubRunUrl && evidence?.githubRunUrl !== new URL(expected.githubRunUrl).href) {
    errors.push("githubRunUrl does not match the verified staging run");
  }
  if (!evidence?.sourceCiRunId || !evidence?.sourceCiRunUrl) errors.push("source CI provenance is missing");
  for (const check of requiredStagingReleaseChecks) {
    if (evidence?.checks?.[check] !== "passed") errors.push(`check ${check} must pass`);
  }
  if (!evidence?.productionEligible || evidence?.productionEligibilityReasons?.length) {
    errors.push("staging release is not production eligible");
  }
  return { valid: errors.length === 0, errors };
}
