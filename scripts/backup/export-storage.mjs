import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [outputRoot, manifestPath] = process.argv.slice(2);
if (!outputRoot || !manifestPath) {
  throw new Error("Usage: export-storage.mjs OUTPUT_ROOT MANIFEST");
}

const url = process.env.BACKUP_SUPABASE_URL;
const serviceKey = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Storage backup credentials are missing");

const buckets = (process.env.BACKUP_STORAGE_BUCKETS ?? "documents,floor-plans,avatars")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (!buckets.length) throw new Error("At least one storage bucket is required");

const root = resolve(outputRoot);
const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const entries = [];

function safeTarget(bucket, objectPath) {
  const segments = [bucket, ...objectPath.split("/")];
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe storage object path: ${bucket}/${objectPath}`);
  }
  const target = resolve(root, ...segments);
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`Storage object escapes backup root: ${objectPath}`);
  return target;
}

async function listFolder(bucket, prefix) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    result.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return result;
  }
}

for (const bucket of buckets) {
  const folders = [""];
  while (folders.length) {
    const prefix = folders.shift();
    const items = await listFolder(bucket, prefix);
    for (const item of items) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id && !item.metadata) {
        folders.push(objectPath);
        continue;
      }
      const { data, error } = await client.storage.from(bucket).download(objectPath);
      if (error) throw error;
      const content = Buffer.from(await data.arrayBuffer());
      const target = safeTarget(bucket, objectPath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, { mode: 0o600 });
      entries.push({
        bucket,
        path: objectPath,
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }
  }
}

entries.sort((left, right) => `${left.bucket}/${left.path}`.localeCompare(`${right.bucket}/${right.path}`));
await mkdir(dirname(resolve(manifestPath)), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify({ version: 1, createdAt: new Date().toISOString(), buckets, entries }, null, 2)}\n`, { mode: 0o600 });
console.log(`Storage export completed: ${entries.length} objects from ${buckets.length} buckets.`);
