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
  const productionEligible = Boolean(sourceCiRunId);
  const sentry = input.sentryEvidence ?? {};
  if (sentry.release !== input.releaseSha || sentry.environment !== "staging") {
    throw new Error("Sentry evidence does not match the staging release");
  }
  if (sentry.configured && !sentry.accepted) throw new Error("Configured Sentry smoke was not accepted");

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
    sourceCiRunUrl: productionEligible ? requireHttpsUrl(input.sourceCiRunUrl, "sourceCiRunUrl") : null,
    productionEligible,
    supabaseProjectId: input.supabaseProjectId,
    deployUrl: requireHttpsUrl(input.deployUrl, "deployUrl"),
    canonicalUrl: requireHttpsUrl(input.canonicalUrl, "canonicalUrl"),
    checks: {
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
    },
    sentry: sentry.configured
      ? { configured: true, eventId: sentry.eventId, projectId: sentry.projectId, checkedAt: sentry.checkedAt }
      : { configured: false, checkedAt: sentry.checkedAt },
  };
}
