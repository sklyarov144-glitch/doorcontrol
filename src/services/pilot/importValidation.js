const allowedDoorTypes = new Set(["apartment", "mop", "Квартирная", "МОП"]);
const allowedDoorStatuses = new Set(["не начато", "доставлена", "смонтирована", "замечание", "принято технадзором", "передано по акту"]);
const allowedOpeningStatuses = new Set(["готов", "требует корректировки", "передан на исправление", "исправлен"]);
const allowedIssueStatuses = new Set(["нет", "есть замечание", "устранено"]);
const allowedCustodyStatuses = new Set(["не передана", "акт подготовлен", "акт загружен", "передано по акту", "закрыто"]);
const allowedTnStatuses = new Set(["не передано", "передано ТН", "принято ТН", "принято технадзором"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePilotImport(payload) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const counts = { objects: 0, buildings: 0, floors: 0, doors: 0 };

  const requireText = (value, path) => {
    if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`);
  };
  const registerId = (value, path) => {
    requireText(value, path);
    if (!value) return;
    if (ids.has(value)) errors.push(`${path} duplicates legacy id ${value}`);
    ids.add(value);
  };
  const optionalStatus = (value, allowed, path) => {
    if (value != null && value !== "" && !allowed.has(value)) errors.push(`${path} is unsupported`);
  };
  const optionalTimestamp = (value, path) => {
    if (value == null || value === "") return null;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
      errors.push(`${path} must be an ISO date or timestamp`);
      return null;
    }
    return new Date(value).getTime();
  };

  if (!payload || !Array.isArray(payload.objects) || payload.objects.length === 0) {
    return { valid: false, ready: false, errors: ["objects must be a non-empty array"], warnings, counts };
  }

  payload.objects.forEach((object, objectIndex) => {
    const objectPath = `objects[${objectIndex}]`;
    counts.objects += 1;
    registerId(object.legacyId, `${objectPath}.legacyId`);
    requireText(object.name, `${objectPath}.name`);
    if (object.responsibleDirectorId && !uuidPattern.test(object.responsibleDirectorId)) errors.push(`${objectPath}.responsibleDirectorId must be a UUID`);
    if (!object.responsibleDirectorId) warnings.push(`${objectPath} has no responsible director`);
    if (!Array.isArray(object.buildings) || object.buildings.length === 0) errors.push(`${objectPath}.buildings must not be empty`);

    (object.buildings ?? []).forEach((building, buildingIndex) => {
      const buildingPath = `${objectPath}.buildings[${buildingIndex}]`;
      counts.buildings += 1;
      registerId(building.legacyId, `${buildingPath}.legacyId`);
      requireText(building.name, `${buildingPath}.name`);
      if (building.responsibleItrId && !uuidPattern.test(building.responsibleItrId)) errors.push(`${buildingPath}.responsibleItrId must be a UUID`);
      if (!building.responsibleItrId) warnings.push(`${buildingPath} has no responsible ITR`);
      if (!Number.isInteger(building.floorsCount) || building.floorsCount < 1) errors.push(`${buildingPath}.floorsCount must be a positive integer`);
      if (building.readiness != null && (!Number.isFinite(building.readiness) || building.readiness < 0 || building.readiness > 100)) {
        errors.push(`${buildingPath}.readiness must be a number from 0 to 100`);
      }
      if (building.hasParking != null && typeof building.hasParking !== "boolean") errors.push(`${buildingPath}.hasParking must be boolean`);
      const floorNumbers = new Set();

      if (!Array.isArray(building.floors) || building.floors.length === 0 || building.floors.length > building.floorsCount) {
        errors.push(`${buildingPath}.floors must contain from 1 to floorsCount entries`);
      }
      (building.floors ?? []).forEach((floor, floorIndex) => {
        const floorPath = `${buildingPath}.floors[${floorIndex}]`;
        counts.floors += 1;
        registerId(floor.legacyId, `${floorPath}.legacyId`);
        if (!Number.isInteger(floor.number) || floor.number < 1 || floor.number > building.floorsCount) {
          errors.push(`${floorPath}.number must be an integer from 1 to floorsCount`);
        }
        if (floorNumbers.has(floor.number)) errors.push(`${floorPath}.number duplicates floor ${floor.number}`);
        floorNumbers.add(floor.number);
        const marks = new Set();
        const openings = new Set();

        if (!Array.isArray(floor.doors)) errors.push(`${floorPath}.doors must be an array`);
        (floor.doors ?? []).forEach((door, doorIndex) => {
          const doorPath = `${floorPath}.doors[${doorIndex}]`;
          counts.doors += 1;
          registerId(door.legacyId, `${doorPath}.legacyId`);
          requireText(door.label, `${doorPath}.label`);
          requireText(door.mark, `${doorPath}.mark`);
          if (marks.has(door.mark)) errors.push(`${doorPath}.mark duplicates ${door.mark} on the floor`);
          marks.add(door.mark);
          if (!allowedDoorTypes.has(door.type)) errors.push(`${doorPath}.type is unsupported`);
          optionalStatus(door.status, allowedDoorStatuses, `${doorPath}.status`);
          optionalStatus(door.openingStatus, allowedOpeningStatuses, `${doorPath}.openingStatus`);
          optionalStatus(door.issueStatus, allowedIssueStatuses, `${doorPath}.issueStatus`);
          optionalStatus(door.custodyActStatus, allowedCustodyStatuses, `${doorPath}.custodyActStatus`);
          optionalStatus(door.tnStatus, allowedTnStatuses, `${doorPath}.tnStatus`);
          if (door.openingNumber != null) {
            if (!Number.isInteger(door.openingNumber) || door.openingNumber < 1) errors.push(`${doorPath}.openingNumber must be a positive integer`);
            if (openings.has(door.openingNumber)) errors.push(`${doorPath}.openingNumber duplicates ${door.openingNumber}`);
            openings.add(door.openingNumber);
          }
          if (![door.x, door.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
            errors.push(`${doorPath}.x and y must be percentages from 0 to 100`);
          }
          if (door.assignedUserId && !uuidPattern.test(door.assignedUserId)) errors.push(`${doorPath}.assignedUserId must be a UUID`);
          if (!door.assignedUserId && !building.responsibleItrId) warnings.push(`${doorPath} has no assigned user or building fallback`);
          for (const field of ["widthFact", "heightFact"]) {
            if (door[field] != null && (!Number.isFinite(door[field]) || door[field] <= 0)) {
              errors.push(`${doorPath}.${field} must be a positive number`);
            }
          }

          const mountedAt = optionalTimestamp(door.mountedAt, `${doorPath}.mountedAt`);
          const tnAcceptedAt = optionalTimestamp(door.tnAcceptedAt, `${doorPath}.tnAcceptedAt`);
          const actUploadedAt = optionalTimestamp(door.custodyActUploadedAt, `${doorPath}.custodyActUploadedAt`);
          const actClosedAt = optionalTimestamp(door.custodyActClosedAt, `${doorPath}.custodyActClosedAt`);
          if (["смонтирована", "принято технадзором", "передано по акту"].includes(door.status) && mountedAt == null) {
            warnings.push(`${doorPath} has a completed installation status without mountedAt`);
          }
          if (["принято ТН", "принято технадзором"].includes(door.tnStatus) && tnAcceptedAt == null) {
            warnings.push(`${doorPath} has accepted TN status without tnAcceptedAt`);
          }
          if (["акт загружен", "передано по акту", "закрыто"].includes(door.custodyActStatus) && actUploadedAt == null) {
            warnings.push(`${doorPath} has uploaded custody status without custodyActUploadedAt`);
          }
          if (["передано по акту", "закрыто"].includes(door.custodyActStatus) && actClosedAt == null) {
            warnings.push(`${doorPath} has closed custody status without custodyActClosedAt`);
          }
          if (mountedAt != null && tnAcceptedAt != null && tnAcceptedAt < mountedAt) errors.push(`${doorPath}.tnAcceptedAt cannot precede mountedAt`);
          if (mountedAt != null && actUploadedAt != null && actUploadedAt < mountedAt) errors.push(`${doorPath}.custodyActUploadedAt cannot precede mountedAt`);
          if (actUploadedAt != null && actClosedAt != null && actClosedAt < actUploadedAt) errors.push(`${doorPath}.custodyActClosedAt cannot precede custodyActUploadedAt`);
        });
      });
    });
  });

  return { valid: errors.length === 0, ready: errors.length === 0 && warnings.length === 0, errors, warnings, counts };
}
