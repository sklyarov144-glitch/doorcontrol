import path from "node:path";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function required(values, name) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function parseImportExecutionConfig(values, options) {
  if (!options.apply) return { apply: false };
  const target = required(values, "IMPORT_TARGET");
  if (!["STAGING", "PRODUCTION"].includes(target)) throw new Error("IMPORT_TARGET must be STAGING or PRODUCTION");
  if (target === "PRODUCTION" && options.allowUnassigned) {
    throw new Error("--allow-unassigned is forbidden for production import");
  }
  const companyId = required(values, "SUPABASE_COMPANY_ID");
  if (!uuidPattern.test(companyId)) throw new Error("SUPABASE_COMPANY_ID must be a UUID");
  const sourceSha256 = options.sourceSha256;
  if (!/^[0-9a-f]{64}$/i.test(sourceSha256 ?? "")) throw new Error("sourceSha256 is invalid");
  const expectedConfirmation = `${target}:${companyId}:${sourceSha256.slice(0, 12).toLowerCase()}`;
  if (values.IMPORT_CONFIRM !== expectedConfirmation) {
    throw new Error(`Set IMPORT_CONFIRM=${expectedConfirmation}`);
  }

  const projectId = required(values, "SUPABASE_PROJECT_ID");
  if (!/^[a-z0-9]{20}$/.test(projectId)) throw new Error("SUPABASE_PROJECT_ID is invalid");
  const url = new URL(required(values, "SUPABASE_URL"));
  if (url.protocol !== "https:" || url.hostname !== `${projectId}.supabase.co`) {
    throw new Error("SUPABASE_URL must be hosted HTTPS and match SUPABASE_PROJECT_ID");
  }
  const evidencePath = required(values, "IMPORT_EVIDENCE_PATH");
  if (!path.isAbsolute(evidencePath)) throw new Error("IMPORT_EVIDENCE_PATH must be an absolute path");
  const releaseSha = required(values, "RELEASE_SHA");
  if (!/^[0-9a-f]{40}$/i.test(releaseSha)) throw new Error("RELEASE_SHA must be a full commit SHA");

  return {
    apply: true,
    target,
    companyId,
    projectId,
    url: url.href.replace(/\/$/, ""),
    serviceRoleKey: required(values, "SUPABASE_SERVICE_ROLE_KEY"),
    evidencePath,
    releaseSha: releaseSha.toLowerCase(),
    sourceSha256: sourceSha256.toLowerCase(),
  };
}

export function createImportExecutionEvidence(config, expectedCounts, appliedCounts, importedAt = new Date().toISOString()) {
  for (const key of ["objects", "buildings", "floors", "doors"]) {
    if (!Number.isInteger(expectedCounts?.[key]) || expectedCounts[key] < 1 || expectedCounts[key] !== appliedCounts?.[key]) {
      throw new Error(`Applied count mismatch for ${key}`);
    }
  }
  return {
    schemaVersion: 1,
    environment: config.target.toLowerCase(),
    releaseSha: config.releaseSha,
    importedAt,
    supabaseProjectId: config.projectId,
    companyId: config.companyId,
    sourceSha256: config.sourceSha256,
    result: "passed",
    expectedCounts,
    appliedCounts,
  };
}
