const extensionPattern = /\.([a-z0-9]{1,10})$/i;

function extensionOf(fileName) {
  return fileName?.match(extensionPattern)?.[1]?.toLowerCase() ?? "bin";
}

function identifier(value, field) {
  const normalized = String(value ?? "");
  if (!/^[a-z0-9_-]+$/i.test(normalized)) throw new Error(`${field} is invalid`);
  return normalized;
}

export function buildDocumentPath({
  companyId,
  objectId,
  buildingId,
  floorId,
  doorId,
  fileName,
  fileId = crypto.randomUUID(),
}) {
  if (doorId && (!floorId || !buildingId)) throw new Error("doorId requires floorId and buildingId");
  if (floorId && !buildingId) throw new Error("floorId requires buildingId");
  const scope = [
    identifier(companyId, "companyId"),
    identifier(objectId, "objectId"),
    buildingId ? identifier(buildingId, "buildingId") : "_",
    floorId ? identifier(floorId, "floorId") : "_",
    doorId ? identifier(doorId, "doorId") : "_",
  ];
  return `${scope.join("/")}/${identifier(fileId, "fileId")}.${extensionOf(fileName)}`;
}

export function buildFloorPlanPath({ companyId, objectId, buildingId, floorId, fileName, fileId = crypto.randomUUID() }) {
  return `${identifier(companyId, "companyId")}/${identifier(objectId, "objectId")}/${identifier(buildingId, "buildingId")}/${identifier(floorId, "floorId")}/${identifier(fileId, "fileId")}.${extensionOf(fileName)}`;
}

export function buildAvatarPath({ userId, fileName, fileId = crypto.randomUUID() }) {
  return `${identifier(userId, "userId")}/${identifier(fileId, "fileId")}.${extensionOf(fileName)}`;
}
