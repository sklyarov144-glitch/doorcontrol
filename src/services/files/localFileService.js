function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export const localFileService = {
  async uploadDocument(_context, file) {
    return { bucket: "local", path: file.name, uri: await readDataUrl(file) };
  },
  async uploadFloorPlan(_context, file) {
    return { bucket: "local", path: file.name, uri: await readDataUrl(file) };
  },
  async uploadAvatar(_context, file) {
    return { bucket: "local", path: file.name, uri: await readDataUrl(file) };
  },
  async createSignedUrl(_bucket, path) {
    return path;
  },
  async remove() {},
};

