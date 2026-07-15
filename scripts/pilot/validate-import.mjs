import fs from "node:fs/promises";
import { validatePilotImport } from "../../src/services/pilot/importValidation.js";

export async function readAndValidate(path) {
  const payload = JSON.parse(await fs.readFile(path, "utf8"));
  return { payload, result: validatePilotImport(payload) };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const path = process.argv[2] ?? "pilot/import-template.json";
  const strict = process.argv.includes("--strict");
  try {
    const { result } = await readAndValidate(path);
    console.log(JSON.stringify(result.counts, null, 2));
    result.warnings.forEach((warning) => console.warn(`WARN ${warning}`));
    result.errors.forEach((error) => console.error(`ERROR ${error}`));
    if (!result.valid || strict && result.warnings.length > 0) process.exit(1);
    console.log(`Import preflight passed: ${path}`);
  } catch (error) {
    console.error(`Import preflight failed: ${error.message}`);
    process.exit(1);
  }
}
