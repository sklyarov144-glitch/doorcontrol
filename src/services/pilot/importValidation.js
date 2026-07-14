const allowedDoorTypes = new Set(["apartment", "mop", "Квартирная", "МОП"]);
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

  if (!payload || !Array.isArray(payload.objects) || payload.objects.length === 0) {
    return { valid: false, errors: ["objects must be a non-empty array"], warnings, counts };
  }

  payload.objects.forEach((object, objectIndex) => {
    const objectPath = `objects[${objectIndex}]`;
    counts.objects += 1;
    registerId(object.legacyId, `${objectPath}.legacyId`);
    requireText(object.name, `${objectPath}.name`);
    if (object.responsibleDirectorId && !uuidPattern.test(object.responsibleDirectorId)) errors.push(`${objectPath}.responsibleDirectorId must be a UUID`);
    if (!Array.isArray(object.buildings) || object.buildings.length === 0) errors.push(`${objectPath}.buildings must not be empty`);

    (object.buildings ?? []).forEach((building, buildingIndex) => {
      const buildingPath = `${objectPath}.buildings[${buildingIndex}]`;
      counts.buildings += 1;
      registerId(building.legacyId, `${buildingPath}.legacyId`);
      requireText(building.name, `${buildingPath}.name`);
      if (building.responsibleItrId && !uuidPattern.test(building.responsibleItrId)) errors.push(`${buildingPath}.responsibleItrId must be a UUID`);
      if (!Number.isInteger(building.floorsCount) || building.floorsCount < 1) errors.push(`${buildingPath}.floorsCount must be a positive integer`);
      const floorNumbers = new Set();

      if (!Array.isArray(building.floors) || building.floors.length !== building.floorsCount) {
        errors.push(`${buildingPath}.floors must contain exactly floorsCount entries`);
      }
      (building.floors ?? []).forEach((floor, floorIndex) => {
        const floorPath = `${buildingPath}.floors[${floorIndex}]`;
        counts.floors += 1;
        registerId(floor.legacyId, `${floorPath}.legacyId`);
        if (!Number.isInteger(floor.number)) errors.push(`${floorPath}.number must be an integer`);
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
          if (door.openingNumber != null) {
            if (!Number.isInteger(door.openingNumber) || door.openingNumber < 1) errors.push(`${doorPath}.openingNumber must be a positive integer`);
            if (openings.has(door.openingNumber)) errors.push(`${doorPath}.openingNumber duplicates ${door.openingNumber}`);
            openings.add(door.openingNumber);
          }
          if (![door.x, door.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
            errors.push(`${doorPath}.x and y must be percentages from 0 to 100`);
          }
          if (door.assignedUserId && !uuidPattern.test(door.assignedUserId)) errors.push(`${doorPath}.assignedUserId must be a UUID`);
          if (!door.assignedUserId) warnings.push(`${doorPath} has no assigned user`);
        });
      });
    });
  });

  return { valid: errors.length === 0, errors, warnings, counts };
}
