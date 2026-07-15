import { createClient } from "@supabase/supabase-js";
import { readAndValidate } from "./validate-import.mjs";

const inputPath = process.argv.find((value) => value.endsWith(".json")) ?? "pilot/import-template.json";
const apply = process.argv.includes("--apply");
const allowUnassigned = process.argv.includes("--allow-unassigned");
const companyId = process.env.SUPABASE_COMPANY_ID;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  console.log("Dry run only. Add --apply with staging credentials to write data.");
  process.exit(0);
}
if (!url || !serviceKey || !companyId) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_COMPANY_ID are required for --apply.");
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await client.rpc("import_pilot_hierarchy", {
  p_company_id: companyId,
  p_payload: payload,
});
if (error) throw new Error(`Transactional import failed: ${error.message}`);

console.log(`Pilot import applied atomically: ${JSON.stringify(data)}.`);
console.log("Run count reconciliation and role-based acceptance checks before production use.");
