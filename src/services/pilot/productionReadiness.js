import { validatePilotReconciliationEvidence } from "./importReconciliation.js";
import { validateProductionHandoff } from "./productionHandoff.js";
import { validateUatEvidence } from "./uatEvidence.js";

const requiredRestoreCounts = ["companies", "profiles", "objects", "buildings", "floors", "doors"];
const optionalRestoreCounts = ["tasks", "documents", "storageObjects"];

export function validateRestoreEvidence(evidence, options = {}) {
  const errors = [];
  const now = options.now ?? new Date();
  const maxAgeDays = options.maxAgeDays ?? 30;
  const maxDurationSeconds = options.maxDurationSeconds ?? 4 * 60 * 60;
  if (evidence?.version !== 1) errors.push("version must be 1");
  if (evidence?.result !== "passed" || evidence?.countsMatch !== true) errors.push("restore must pass with matching counts");
  if (!Number.isInteger(evidence?.backupRunId) || evidence.backupRunId < 1) errors.push("backupRunId is invalid");
  if (!/^[0-9a-f]{64}$/i.test(evidence?.archiveSha256 ?? "")) errors.push("archiveSha256 is invalid");
  if (evidence?.restoreTarget !== "isolated-local-supabase") errors.push("restoreTarget must be isolated-local-supabase");
  const startedAt = Date.parse(evidence?.startedAt);
  const completedAt = Date.parse(evidence?.completedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    errors.push("restore timestamps are invalid");
  } else {
    const age = now.valueOf() - completedAt;
    if (age < -5 * 60 * 1000) errors.push("completedAt cannot be in the future");
    if (age > maxAgeDays * 24 * 60 * 60 * 1000) errors.push(`restore evidence is older than ${maxAgeDays} days`);
  }
  if (!Number.isInteger(evidence?.durationSeconds) || evidence.durationSeconds < 0
      || evidence.durationSeconds > maxDurationSeconds) {
    errors.push(`restore duration must not exceed ${maxDurationSeconds} seconds`);
  }
  for (const key of [...requiredRestoreCounts, ...optionalRestoreCounts]) {
    const source = evidence?.sourceRows?.[key];
    const restored = evidence?.restoredRows?.[key];
    if (!Number.isInteger(source) || source < 0 || source !== restored) errors.push(`restore count ${key} must match`);
  }
  for (const key of requiredRestoreCounts) {
    if ((evidence?.sourceRows?.[key] ?? 0) < 1) errors.push(`required restored entity ${key} is empty`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateProductionReadinessEvidence(input, expectedReleaseSha, options = {}) {
  const uat = validateUatEvidence(input.uat, expectedReleaseSha);
  const reconciliation = validatePilotReconciliationEvidence(input.reconciliation, expectedReleaseSha, options);
  const restore = validateRestoreEvidence(input.restore, options);
  const evidenceTimestamps = [
    input.reconciliation?.generatedAt,
    input.restore?.completedAt,
    input.uat?.signoffs?.productOwner?.approvedAt,
    input.uat?.signoffs?.itrRepresentative?.approvedAt,
  ].map((value) => Date.parse(value)).filter(Number.isFinite);
  const handoff = validateProductionHandoff(input.handoff, expectedReleaseSha, input.reconciliation, {
    ...options,
    approvalNotBefore: evidenceTimestamps.length
      ? new Date(Math.max(...evidenceTimestamps))
      : undefined,
  });
  const errors = [
    ...uat.errors.map((error) => `UAT: ${error}`),
    ...reconciliation.errors.map((error) => `reconciliation: ${error}`),
    ...restore.errors.map((error) => `restore: ${error}`),
    ...handoff.errors.map((error) => `handoff: ${error}`),
  ];
  return {
    valid: errors.length === 0,
    errors,
    checks: {
      uat: uat.valid,
      reconciliation: reconciliation.valid,
      restore: restore.valid,
      handoff: handoff.valid,
    },
  };
}
