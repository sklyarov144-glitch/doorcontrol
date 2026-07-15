const comparableFields = {
  objects: ["name", "district", "metro", "status", "responsibleDirectorId"],
  buildings: ["objectLegacyId", "name", "floorsCount", "hasParking", "responsibleItrId"],
  floors: ["buildingLegacyId", "number", "planImageUrl"],
  doors: [
    "floorLegacyId", "label", "mark", "type", "openingNumber", "status", "openingStatus",
    "issueStatus", "custodyActStatus", "tnStatus", "assignedUserId", "x", "y", "model",
    "widthFact", "heightFact",
  ],
};

function normalize(value) {
  if (value === undefined || value === "") return null;
  return typeof value === "number" ? Number(value) : value;
}

function flattenExpected(payload) {
  const result = { objects: [], buildings: [], floors: [], doors: [] };
  for (const object of payload.objects) {
    result.objects.push({
      legacyId: object.legacyId,
      name: object.name,
      district: object.district,
      metro: object.metro,
      status: object.status ?? "В работе",
      responsibleDirectorId: object.responsibleDirectorId,
    });
    for (const building of object.buildings) {
      result.buildings.push({
        legacyId: building.legacyId,
        objectLegacyId: object.legacyId,
        name: building.name,
        floorsCount: building.floorsCount,
        hasParking: building.hasParking ?? false,
        responsibleItrId: building.responsibleItrId,
      });
      for (const floor of building.floors) {
        result.floors.push({
          legacyId: floor.legacyId,
          buildingLegacyId: building.legacyId,
          number: floor.number,
          planImageUrl: floor.planImageUrl,
        });
        for (const door of floor.doors) {
          result.doors.push({
            legacyId: door.legacyId,
            floorLegacyId: floor.legacyId,
            label: door.label,
            mark: door.mark,
            type: door.type,
            openingNumber: door.openingNumber,
            status: door.status ?? "не начато",
            openingStatus: door.openingStatus ?? "готов",
            issueStatus: door.issueStatus ?? "нет",
            custodyActStatus: door.custodyActStatus ?? "не передана",
            tnStatus: door.tnStatus ?? "не передано",
            assignedUserId: door.assignedUserId,
            x: door.x,
            y: door.y,
            model: door.model,
            widthFact: door.widthFact,
            heightFact: door.heightFact,
          });
        }
      }
    }
  }
  return result;
}

function compareCollection(kind, expectedRows, actualRows) {
  const errors = [];
  const actualByLegacyId = new Map(actualRows.map((row) => [row.legacyId, row]));
  const expectedIds = new Set(expectedRows.map((row) => row.legacyId));

  for (const expected of expectedRows) {
    const actual = actualByLegacyId.get(expected.legacyId);
    if (!actual) {
      errors.push(`${kind} ${expected.legacyId} is missing`);
      continue;
    }
    for (const field of comparableFields[kind]) {
      if (normalize(actual[field]) !== normalize(expected[field])) {
        errors.push(
          `${kind} ${expected.legacyId}.${field}: expected ${JSON.stringify(normalize(expected[field]))}, received ${JSON.stringify(normalize(actual[field]))}`,
        );
      }
    }
  }

  for (const actual of actualRows) {
    if (!expectedIds.has(actual.legacyId)) errors.push(`${kind} ${actual.legacyId ?? actual.id} was not present in the import payload`);
  }
  return errors;
}

export function reconcilePilotImport(payload, actual) {
  const expected = flattenExpected(payload);
  const errors = Object.keys(comparableFields).flatMap((kind) =>
    compareCollection(kind, expected[kind], actual[kind] ?? []));
  return {
    valid: errors.length === 0,
    errors,
    expectedCounts: Object.fromEntries(Object.entries(expected).map(([kind, rows]) => [kind, rows.length])),
    actualCounts: Object.fromEntries(Object.keys(expected).map((kind) => [kind, (actual[kind] ?? []).length])),
  };
}
