export function createReleaseEvidence(input) {
  if (!/^[0-9a-f]{40}$/i.test(input.releaseSha)) throw new Error("releaseSha must be a full commit SHA");
  if (!/^[a-z0-9]{20}$/.test(input.supabaseProjectId)) throw new Error("supabaseProjectId is invalid");
  const deployUrl = new URL(input.deployUrl);
  const canonicalUrl = new URL(input.canonicalUrl);
  const stagingRunUrl = new URL(input.stagingRunUrl);
  if ([deployUrl, canonicalUrl, stagingRunUrl].some((url) => url.protocol !== "https:")) {
    throw new Error("Release evidence URLs must use HTTPS");
  }
  return {
    schemaVersion: 1,
    environment: "production",
    releaseSha: input.releaseSha.toLowerCase(),
    deployedAt: input.deployedAt,
    deployedBy: input.deployedBy,
    repository: input.repository,
    githubRunId: input.githubRunId,
    stagingRunId: input.stagingRunId,
    stagingRunUrl: stagingRunUrl.href,
    supabaseProjectId: input.supabaseProjectId,
    deployUrl: deployUrl.href,
    canonicalUrl: canonicalUrl.href,
    checks: {
      stagingProvenance: "passed",
      ci: "passed",
      configuration: "passed",
      databaseMigrations: "passed",
      edgeFunctions: "passed",
      backendHealth: "passed",
      productionBundle: "passed",
      deploymentUrlSmoke: "passed",
      canonicalUrlSmoke: "passed",
    },
  };
}
