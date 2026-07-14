import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const [manifestPath, root = "."] = process.argv.slice(2);
if (!manifestPath) throw new Error("Usage: verify-manifest.mjs MANIFEST [ROOT]");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.version !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length < 3) {
  throw new Error("Backup manifest is incomplete");
}

for (const entry of manifest.entries) {
  const path = resolve(root, entry.path);
  const content = readFileSync(path);
  const checksum = createHash("sha256").update(content).digest("hex");
  if (statSync(path).size !== entry.bytes || checksum !== entry.sha256) {
    throw new Error(`Backup component verification failed: ${entry.path}`);
  }
}

console.log(`Backup manifest verified: ${manifest.entries.length} files.`);
