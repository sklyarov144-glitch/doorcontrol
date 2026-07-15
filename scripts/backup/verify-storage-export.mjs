import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

const [manifestPath, storageRoot] = process.argv.slice(2);
if (!manifestPath || !storageRoot) {
  throw new Error("Usage: verify-storage-export.mjs MANIFEST STORAGE_ROOT");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.version !== 1 || !Array.isArray(manifest.buckets) || !Array.isArray(manifest.entries)) {
  throw new Error("Storage backup manifest is invalid");
}

const root = resolve(storageRoot);
const seen = new Set();
let bytes = 0;
for (const entry of manifest.entries) {
  const key = `${entry.bucket}/${entry.path}`;
  if (entry.contentType && typeof entry.contentType !== "string") {
    throw new Error(`Invalid storage content type: ${key}`);
  }
  if (seen.has(key)) throw new Error(`Duplicate storage manifest entry: ${key}`);
  seen.add(key);
  const target = resolve(root, entry.bucket, ...entry.path.split("/"));
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`Unsafe storage manifest path: ${key}`);
  const content = readFileSync(target);
  const checksum = createHash("sha256").update(content).digest("hex");
  if (statSync(target).size !== entry.bytes || checksum !== entry.sha256) {
    throw new Error(`Storage object verification failed: ${key}`);
  }
  bytes += entry.bytes;
}

console.log(`Storage export verified: ${manifest.entries.length} objects, ${bytes} bytes.`);
