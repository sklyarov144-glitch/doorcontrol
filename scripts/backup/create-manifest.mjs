import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const [output, ...files] = process.argv.slice(2);
if (!output || files.length === 0) throw new Error("Usage: create-manifest.mjs OUTPUT FILE...");

const entries = files.map((path) => {
  const content = readFileSync(path);
  if (content.length === 0) throw new Error(`Backup component is empty: ${path}`);
  return {
    path: basename(path),
    bytes: statSync(path).size,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
});

writeFileSync(output, `${JSON.stringify({ version: 1, createdAt: new Date().toISOString(), entries }, null, 2)}\n`, { mode: 0o600 });
console.log(`Backup manifest created for ${entries.length} files.`);
