import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [output, sourceCountsPath, restoredCountsPath, archivePath, backupRunId, startedAt, completedAt] = process.argv.slice(2);
if (!output || !sourceCountsPath || !restoredCountsPath || !archivePath || !backupRunId || !startedAt || !completedAt) {
  throw new Error(
    "Usage: create-restore-evidence.mjs OUTPUT SOURCE_COUNTS RESTORED_COUNTS ARCHIVE BACKUP_RUN_ID STARTED_AT COMPLETED_AT",
  );
}
if (!/^\d+$/.test(backupRunId)) throw new Error("Backup run id must be numeric");

const sourceCounts = JSON.parse(readFileSync(sourceCountsPath, "utf8"));
const restoredCounts = JSON.parse(readFileSync(restoredCountsPath, "utf8"));
const required = ["companies", "profiles", "objects", "buildings", "floors", "doors"];
for (const key of [...required, "tasks", "documents", "storageObjects"]) {
  if (!Number.isInteger(sourceCounts[key]) || sourceCounts[key] < 0) {
    throw new Error(`Invalid source row count: ${key}`);
  }
  if (!Number.isInteger(restoredCounts[key]) || restoredCounts[key] < 0) {
    throw new Error(`Invalid restored row count: ${key}`);
  }
  if (sourceCounts[key] !== restoredCounts[key]) {
    throw new Error(`Restore count mismatch for ${key}: expected ${sourceCounts[key]}, received ${restoredCounts[key]}`);
  }
}
for (const key of required) {
  if (sourceCounts[key] === 0) throw new Error(`Required source entity is empty: ${key}`);
}

const started = new Date(startedAt);
const completed = new Date(completedAt);
if (!Number.isFinite(started.valueOf()) || !Number.isFinite(completed.valueOf()) || completed < started) {
  throw new Error("Invalid restore timestamps");
}

const archiveSha256 = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
const evidence = {
  version: 1,
  result: "passed",
  backupRunId: Number(backupRunId),
  archiveSha256,
  restoreTarget: "isolated-local-supabase",
  startedAt: started.toISOString(),
  completedAt: completed.toISOString(),
  durationSeconds: Math.round((completed - started) / 1000),
  sourceRows: sourceCounts,
  restoredRows: restoredCounts,
  countsMatch: true,
  sourceCommit: process.env.GITHUB_SHA || null,
  workflowRunId: process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null,
};

writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Restore evidence created for backup run ${backupRunId}.`);
