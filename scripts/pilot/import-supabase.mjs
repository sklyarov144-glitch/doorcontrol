import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createImportExecutionEvidence, parseImportExecutionConfig } from "../../src/services/pilot/importExecution.js";
import { readAndValidate } from "./validate-import.mjs";

const inputPath = process.argv.find((value) => value.endsWith(".json")) ?? "pilot/import-template.json";
const apply = process.argv.includes("--apply");
const allowUnassigned = process.argv.includes("--allow-unassigned");
const sourceSha256 = createHash("sha256").update(readFileSync(inputPath)).digest("hex");

const { payload, result } = await readAndValidate(inputPath);
if (!result.valid) {
  result.errors.forEach((error) => console.error(`ERROR ${error}`));
  process.exit(1);
}
if (apply && result.warnings.length > 0 && !allowUnassigned) {
  result.warnings.forEach((warning) => console.error(`UNASSIGNED ${warning}`));
  console.error("Pilot import with --apply requires assigned responsibility. Use --allow-unassigned only for a controlled staging repair.");
  process.exit(1);
}

console.log(`Validated ${result.counts.objects} objects, ${result.counts.buildings} buildings, ${result.counts.floors} floors and ${result.counts.doors} doors.`);
result.warnings.forEach((warning) => console.warn(`WARN ${warning}`));
if (!apply) {
  console.log("Dry run only. Add --apply with explicit environment confirmation to write data.");
  process.exit(0);
}
const config = parseImportExecutionConfig(process.env, { apply, allowUnassigned, sourceSha256 });

mkdirSync(path.dirname(config.evidencePath), { recursive: true, mode: 0o700 });
const evidenceFile = openSync(config.evidencePath, "wx", 0o600);
let evidenceCommitted = false;
let data;
try {
  const client = createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false } });
  const response = await client.rpc("import_pilot_hierarchy", {
    p_company_id: config.companyId,
    p_payload: payload,
  });
  if (response.error) throw new Error(`Transactional import failed: ${response.error.message}`);
  data = response.data;
  const evidence = createImportExecutionEvidence(config, result.counts, data);
  writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8" });
  fsyncSync(evidenceFile);
  evidenceCommitted = true;
} finally {
  closeSync(evidenceFile);
  if (!evidenceCommitted) rmSync(config.evidencePath, { force: true });
}
console.log(`Pilot import applied atomically to ${config.target.toLowerCase()}: ${JSON.stringify(data)}.`);
console.log(`Import evidence written with mode 0600: ${config.evidencePath}`);
console.log("Run count reconciliation and role-based acceptance checks before production use.");
