import fs from "node:fs";

const required = [
  "README_DEPLOY.md", "docs/DEPLOYMENT.md", "docs/BACKUP_AND_RECOVERY.md", "docs/RUNBOOK.md",
  "docs/PILOT_PLAN.md", "docs/UAT_CHECKLIST.md", "docs/GO_LIVE_CHECKLIST.md", "pilot/import-template.json",
  ".github/workflows/ci.yml", ".github/workflows/deploy-staging.yml", ".github/workflows/deploy-production.yml",
];
const missing = required.filter((path) => !fs.existsSync(path));
const migrations = fs.readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort();

if (missing.length || migrations.length < 13) {
  missing.forEach((path) => console.error(`Missing readiness artifact: ${path}`));
  if (migrations.length < 13) console.error(`Expected at least 13 migrations, found ${migrations.length}`);
  process.exit(1);
}
console.log(`Pilot readiness artifacts present. ${migrations.length} ordered migrations found.`);
console.log("External staging deployment, restore drill and UAT sign-off must still be recorded before go-live.");
