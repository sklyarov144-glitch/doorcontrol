import { requireSupabase } from "../supabase/client";
import { buildAvatarPath, buildDocumentPath, buildFloorPlanPath } from "./pathBuilder";

const limits = {
  documents: 50 * 1024 * 1024,
  "floor-plans": 20 * 1024 * 1024,
  avatars: 5 * 1024 * 1024,
};

function validateFile(file, bucket) {
  if (!file) throw new Error("Файл не выбран");
  if (file.size > limits[bucket]) throw new Error("Файл превышает допустимый размер");
}

async function upload(bucket, path, file) {
  validateFile(file, bucket);
  const { data, error } = await requireSupabase().storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return { bucket, path: data.path, uri: `storage://${bucket}/${data.path}` };
}

export const supabaseFileService = {
  uploadDocument(context, file) {
    return upload("documents", buildDocumentPath({ ...context, fileName: file.name }), file);
  },
  uploadFloorPlan(context, file) {
    return upload("floor-plans", buildFloorPlanPath({ ...context, fileName: file.name }), file);
  },
  uploadAvatar(context, file) {
    return upload("avatars", buildAvatarPath({ ...context, fileName: file.name }), file);
  },
  async createSignedUrl(bucket, path, expiresIn = 900) {
    const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  async remove(bucket, paths) {
    const { error } = await requireSupabase().storage.from(bucket).remove(paths);
    if (error) throw error;
  },
};

