import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [manifestPath, storageRoot] = process.argv.slice(2);
if (!manifestPath || !storageRoot) {
  throw new Error("Usage: import-storage.mjs MANIFEST STORAGE_ROOT");
}

const url = process.env.BACKUP_SUPABASE_URL;
const serviceKey = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Storage restore credentials are missing");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.version !== 1 || !Array.isArray(manifest.buckets) || !Array.isArray(manifest.entries)) {
  throw new Error("Storage backup manifest is invalid");
}

const root = resolve(storageRoot);
const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: existingBuckets, error: bucketListError } = await client.storage.listBuckets();
if (bucketListError) throw bucketListError;
const existing = new Set((existingBuckets ?? []).map((bucket) => bucket.id));

for (const bucket of manifest.buckets) {
  if (existing.has(bucket)) continue;
  const { error } = await client.storage.createBucket(bucket, { public: false });
  if (error) throw error;
}

for (const entry of manifest.entries) {
  const target = resolve(root, entry.bucket, ...entry.path.split("/"));
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`Unsafe storage manifest path: ${entry.bucket}/${entry.path}`);
  const content = await readFile(target);
  const { error } = await client.storage.from(entry.bucket).upload(entry.path, content, {
    contentType: "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
}

console.log(`Storage restore completed: ${manifest.entries.length} objects.`);
