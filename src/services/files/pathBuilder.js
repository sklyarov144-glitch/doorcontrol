const extensionPattern = /\.([a-z0-9]{1,10})$/i;

function extensionOf(fileName) {
  return fileName?.match(extensionPattern)?.[1]?.toLowerCase() ?? "bin";
}

function identifier(value, field) {
  if (!value || String(value).includes("/")) throw new Error(`${field} is required`);
  return String(value);
}

export function buildDocumentPath({ companyId, objectId, fileName, fileId = crypto.randomUUID() }) {
  return `${identifier(companyId, "companyId")}/${identifier(objectId, "objectId")}/${fileId}.${extensionOf(fileName)}`;
}

export function buildFloorPlanPath({ companyId, objectId, buildingId, floorId, fileName, fileId = crypto.randomUUID() }) {
  return `${identifier(companyId, "companyId")}/${identifier(objectId, "objectId")}/${identifier(buildingId, "buildingId")}/${identifier(floorId, "floorId")}/${fileId}.${extensionOf(fileName)}`;
}

export function buildAvatarPath({ userId, fileName, fileId = crypto.randomUUID() }) {
  return `${identifier(userId, "userId")}/${fileId}.${extensionOf(fileName)}`;
}

