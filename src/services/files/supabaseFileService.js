import { requireSupabase } from "../supabase/client";
import { buildAvatarPath, buildDocumentPath, buildFloorPlanPath } from "./pathBuilder";
import { validateStorageFile, validateStorageLocation } from "./filePolicy";

async function upload(bucket, path, file) {
  validateStorageFile(file, bucket);
  validateStorageLocation(bucket, path);
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
    validateStorageLocation(bucket, path);
    if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 3600) {
      throw new Error("Некорректный срок действия ссылки");
    }
    const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  async remove(bucket, paths) {
    if (!Array.isArray(paths) || paths.length === 0) throw new Error("Не указаны файлы для удаления");
    paths.forEach((path) => validateStorageLocation(bucket, path));
    const { error } = await requireSupabase().storage.from(bucket).remove(paths);
    if (error) throw error;
  },
};
