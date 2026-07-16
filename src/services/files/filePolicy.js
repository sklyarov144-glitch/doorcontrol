const mebibyte = 1024 * 1024;

export const storageFilePolicies = Object.freeze({
  documents: {
    maxBytes: 50 * mebibyte,
    mimeExtensions: {
      "application/pdf": ["pdf"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
    },
  },
  "floor-plans": {
    maxBytes: 20 * mebibyte,
    mimeExtensions: {
      "application/pdf": ["pdf"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
    },
  },
  avatars: {
    maxBytes: 5 * mebibyte,
    mimeExtensions: {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
    },
  },
});

function extensionOf(fileName) {
  return fileName?.match(/\.([a-z0-9]{1,10})$/i)?.[1]?.toLowerCase() ?? "";
}

export function validateStorageFile(file, bucket) {
  const policy = storageFilePolicies[bucket];
  if (!policy) throw new Error("Неизвестное файловое хранилище");
  if (!file) throw new Error("Файл не выбран");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("Файл пуст или повреждён");
  if (file.size > policy.maxBytes) throw new Error("Файл превышает допустимый размер");

  const extensions = policy.mimeExtensions[file.type];
  if (!extensions) throw new Error("Формат файла не поддерживается");
  if (!extensions.includes(extensionOf(file.name))) {
    throw new Error("Расширение файла не соответствует его формату");
  }
  return true;
}

export function validateStorageLocation(bucket, path) {
  if (!storageFilePolicies[bucket]) throw new Error("Неизвестное файловое хранилище");
  if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\")) {
    throw new Error("Некорректный путь файла");
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment
    || segment === "."
    || segment === ".."
    || [...segment].some((character) => character.charCodeAt(0) < 32))) {
    throw new Error("Некорректный путь файла");
  }
  return true;
}

export function storageLocationFromUri(uri) {
  if (!uri?.startsWith("storage://")) return null;
  const [bucket, ...parts] = uri.slice("storage://".length).split("/");
  const path = parts.join("/");
  validateStorageLocation(bucket, path);
  return { bucket, path };
}
