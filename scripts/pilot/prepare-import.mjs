import fs from "node:fs/promises";
import path from "node:path";
import { preparePilotImport } from "../../src/services/pilot/importPreparation.js";
import { validatePilotImport } from "../../src/services/pilot/importValidation.js";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = process.argv.find((value) => value.endsWith(".json") && !value.startsWith("--"))
  ?? "pilot/import-template.json";
const assignmentsPath = option("--assignments", "pilot/user-assignments.json");
const outputPath = option("--output", "pilot/import-ready.json");

if ([inputPath, assignmentsPath, outputPath].some((value) => !value)) {
  throw new Error("Input, --assignments and --output paths are required.");
}
if (path.resolve(outputPath) === path.resolve(inputPath) || path.resolve(outputPath) === path.resolve(assignmentsPath)) {
  throw new Error("Output path must not overwrite the source template or assignments file.");
}

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const assignments = JSON.parse(await fs.readFile(assignmentsPath, "utf8"));
const prepared = preparePilotImport(source, assignments);
if (!prepared.valid) {
  prepared.errors.forEach((error) => console.error(`ASSIGNMENT ${error}`));
  process.exit(1);
}

const validation = validatePilotImport(prepared.payload);
if (!validation.ready) {
  validation.errors.forEach((error) => console.error(`ERROR ${error}`));
  validation.warnings.forEach((warning) => console.error(`UNASSIGNED ${warning}`));
  process.exit(1);
}

const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
try {
  await fs.writeFile(temporaryPath, `${JSON.stringify(prepared.payload, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporaryPath, outputPath);
} finally {
  await fs.rm(temporaryPath, { force: true });
}
await fs.chmod(outputPath, 0o600);
console.log(`Prepared strict pilot import: ${outputPath}`);
console.log(JSON.stringify(validation.counts, null, 2));
