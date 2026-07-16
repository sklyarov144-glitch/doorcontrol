const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assignReference(target, keyField, idField, assignments, path, errors) {
  const key = target[keyField];
  const currentId = target[idField];
  if (!key) return;

  if (currentId) {
    errors.push(`${path} cannot contain both ${keyField} and ${idField}`);
    return;
  }
  const resolvedId = assignments[key];
  if (!resolvedId) {
    errors.push(`${path}.${keyField} references unknown assignment ${key}`);
    return;
  }
  if (!uuidPattern.test(resolvedId)) {
    errors.push(`${path}.${keyField} resolved to an invalid UUID`);
    return;
  }

  target[idField] = resolvedId;
  delete target[keyField];
}

export function preparePilotImport(source, assignments) {
  const payload = structuredClone(source);
  const errors = [];
  if (!payload || !Array.isArray(payload.objects)) {
    return { valid: false, errors: ["objects must be an array"], payload };
  }
  if (!assignments || Array.isArray(assignments) || typeof assignments !== "object") {
    return { valid: false, errors: ["assignments must be an object"], payload };
  }

  payload.objects.forEach((object, objectIndex) => {
    const objectPath = `objects[${objectIndex}]`;
    assignReference(object, "responsibleDirectorKey", "responsibleDirectorId", assignments, objectPath, errors);
    (object.buildings ?? []).forEach((building, buildingIndex) => {
      const buildingPath = `${objectPath}.buildings[${buildingIndex}]`;
      assignReference(building, "responsibleItrKey", "responsibleItrId", assignments, buildingPath, errors);
      (building.floors ?? []).forEach((floor, floorIndex) => {
        (floor.doors ?? []).forEach((door, doorIndex) => {
          assignReference(
            door,
            "assignedUserKey",
            "assignedUserId",
            assignments,
            `${buildingPath}.floors[${floorIndex}].doors[${doorIndex}]`,
            errors,
          );
        });
      });
    });
  });

  return { valid: errors.length === 0, errors, payload };
}
