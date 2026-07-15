import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { reconcilePilotUsers, validatePilotUserManifest } from "../../src/services/pilot/userManifest.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const inputPath = process.argv.find((value) => value.endsWith(".json")) ?? "pilot/users.template.json";
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : "pilot/user-assignments.json";
const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const validation = validatePilotUserManifest(manifest);
if (!validation.valid) {
  validation.errors.forEach((error) => console.error(`USER ${error}`));
  process.exit(1);
}

const url = required("SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const companyId = required("SUPABASE_COMPANY_ID");
if (!url.startsWith("https://") || !url.endsWith(".supabase.co")) throw new Error("SUPABASE_URL must be a hosted Supabase HTTPS URL");
const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const emails = manifest.users.map((user) => user.email.trim().toLowerCase());
const { data: profiles, error } = await client.from("profiles")
  .select("id,email,role,company_id,status")
  .in("email", emails);
if (error) throw new Error(`Unable to verify pilot profiles: ${error.message}`);
const result = reconcilePilotUsers(manifest, profiles, companyId);
if (!result.valid) {
  result.errors.forEach((message) => console.error(`USER ${message}`));
  process.exit(1);
}
fs.writeFileSync(outputPath, `${JSON.stringify(result.assignments, null, 2)}\n`, { mode: 0o600 });
console.log(`Pilot users verified. UUID assignments written to ${outputPath} without emails or credentials.`);
