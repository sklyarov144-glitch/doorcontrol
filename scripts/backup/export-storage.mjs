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
await mkdir(root, { recursive: true });
const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const entries = [];

const { data: availableBuckets, error: bucketsError } = await client.storage.listBuckets();
if (bucketsError) {
  const code = bucketsError.statusCode ?? bucketsError.code;
  if (bucketsError.status === 404 || code === "PGRST1025") {
    const { count: storageObjectCount, error: countError } = await client
      .from("storage.objects")
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;
    if (storageObjectCount !== 0) {
      throw new Error("Storage API is unavailable while production contains Storage objects; refusing an incomplete backup");
    }
    console.log("Storage API has no readable bucket endpoint; verified there are no Storage objects.");
  } else {
    throw bucketsError;
  }
}
const availableNames = new Set((availableBuckets ?? []).map((bucket) => bucket.name));
const existingBuckets = buckets.filter((bucket) => availableNames.has(bucket));
const skippedBuckets = buckets.filter((bucket) => !availableNames.has(bucket));
if (skippedBuckets.length) {
  console.log(`Skipping unavailable storage buckets: ${skippedBuckets.join(", ")}`);
}

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
    if (error) {
      const code = error.statusCode ?? error.code;
      if (error.status === 404 || code === "PGRST1025") {
        console.log(`Skipping unavailable storage path: ${bucket}/${prefix}`);
        return [];
      }
      throw error;
    }
    result.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return result;
  }
}

for (const bucket of existingBuckets) {
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
      if (error) {
        const code = error.statusCode ?? error.code;
        if (error.status === 404 || code === "PGRST1025") {
          console.log(`Skipping unavailable storage object: ${bucket}/${objectPath}`);
          continue;
        }
        throw error;
      }
      const content = Buffer.from(await data.arrayBuffer());
      const target = safeTarget(bucket, objectPath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, { mode: 0o600 });
      entries.push({
        bucket,
        path: objectPath,
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
        contentType: item.metadata?.mimetype ?? "application/octet-stream",
      });
    }
  }
}

entries.sort((left, right) => `${left.bucket}/${left.path}`.localeCompare(`${right.bucket}/${right.path}`));
await mkdir(dirname(resolve(manifestPath)), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify({ version: 1, createdAt: new Date().toISOString(), buckets: existingBuckets, skippedBuckets, entries }, null, 2)}\n`, { mode: 0o600 });
console.log(`Storage export completed: ${entries.length} objects from ${existingBuckets.length} buckets.`);
