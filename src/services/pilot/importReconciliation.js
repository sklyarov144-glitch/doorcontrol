const comparableFields = {
  objects: ["name", "address", "district", "metro", "status", "responsibleDirectorId"],
  buildings: ["objectLegacyId", "name", "floorsCount", "hasParking", "readiness", "responsibleItrId"],
  floors: ["buildingLegacyId", "number", "planImageUrl"],
  doors: [
    "floorLegacyId", "label", "mark", "type", "openingNumber", "status", "openingStatus",
    "issueStatus", "custodyActStatus", "tnStatus", "assignedUserId", "x", "y", "model",
    "widthFact", "heightFact", "mountedAt", "tnAcceptedAt", "custodyActUploadedAt", "custodyActClosedAt",
  ],
};

const timestampFields = new Set(["mountedAt", "tnAcceptedAt", "custodyActUploadedAt", "custodyActClosedAt"]);
const requiredPilotCountKeys = ["objects", "buildings", "floors", "doors"];

function normalize(value, field) {
  if (value == null || value === "") return null;
  if (timestampFields.has(field) && value != null) return new Date(value).toISOString();
  return typeof value === "number" ? Number(value) : value;
}

function flattenExpected(payload) {
  const result = { objects: [], buildings: [], floors: [], doors: [] };
  for (const object of payload.objects) {
    result.objects.push({
      legacyId: object.legacyId,
      name: object.name,
      address: object.address,
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
        readiness: building.readiness ?? 0,
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
            mountedAt: door.mountedAt,
            tnAcceptedAt: door.tnAcceptedAt,
            custodyActUploadedAt: door.custodyActUploadedAt,
            custodyActClosedAt: door.custodyActClosedAt,
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
      if (normalize(actual[field], field) !== normalize(expected[field], field)) {
        errors.push(
          `${kind} ${expected.legacyId}.${field}: expected ${JSON.stringify(normalize(expected[field], field))}, received ${JSON.stringify(normalize(actual[field], field))}`,
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

export function createPilotReconciliationEvidence(input) {
  if (!/^[0-9a-f]{40}$/i.test(input.releaseSha ?? "")) throw new Error("releaseSha must be a full commit SHA");
  if (!/^[a-z0-9]{20}$/.test(input.supabaseProjectId ?? "")) throw new Error("supabaseProjectId is invalid");
  if (!/^[0-9a-f]{64}$/i.test(input.sourceSha256 ?? "")) throw new Error("sourceSha256 is invalid");
  if (!input.companyId?.trim()) throw new Error("companyId is required");
  if (!input.reconciliation?.valid || input.reconciliation.errors?.length) {
    throw new Error("Only a successful reconciliation can produce evidence");
  }
  for (const key of requiredPilotCountKeys) {
    const expected = input.reconciliation.expectedCounts?.[key];
    const actual = input.reconciliation.actualCounts?.[key];
    if (!Number.isInteger(expected) || expected < 1 || expected !== actual) {
      throw new Error(`Invalid reconciliation count for ${key}`);
    }
  }
  return {
    schemaVersion: 1,
    environment: "staging",
    releaseSha: input.releaseSha.toLowerCase(),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    supabaseProjectId: input.supabaseProjectId,
    companyId: input.companyId,
    sourceSha256: input.sourceSha256.toLowerCase(),
    valid: true,
    mismatchCount: 0,
    expectedCounts: input.reconciliation.expectedCounts,
    actualCounts: input.reconciliation.actualCounts,
  };
}

export function validatePilotReconciliationEvidence(evidence, expectedReleaseSha, options = {}) {
  const errors = [];
  const now = options.now ?? new Date();
  const maxAgeDays = options.maxAgeDays ?? 30;
  if (evidence?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (evidence?.environment !== "staging") errors.push("environment must be staging");
  if (!/^[0-9a-f]{40}$/i.test(evidence?.releaseSha ?? "")) errors.push("releaseSha must be a full commit SHA");
  if (expectedReleaseSha && evidence?.releaseSha?.toLowerCase() !== expectedReleaseSha.toLowerCase()) {
    errors.push("releaseSha does not match the requested production release");
  }
  if (!/^[a-z0-9]{20}$/.test(evidence?.supabaseProjectId ?? "")) errors.push("supabaseProjectId is invalid");
  if (!evidence?.companyId?.trim()) errors.push("companyId is required");
  if (!/^[0-9a-f]{64}$/i.test(evidence?.sourceSha256 ?? "")) errors.push("sourceSha256 is invalid");
  const generatedAt = Date.parse(evidence?.generatedAt);
  if (!Number.isFinite(generatedAt)) {
    errors.push("generatedAt must be a timestamp");
  } else {
    const age = now.valueOf() - generatedAt;
    if (age < -5 * 60 * 1000) errors.push("generatedAt cannot be in the future");
    if (age > maxAgeDays * 24 * 60 * 60 * 1000) errors.push(`reconciliation evidence is older than ${maxAgeDays} days`);
  }
  if (evidence?.valid !== true || evidence?.mismatchCount !== 0) errors.push("reconciliation must pass without mismatches");
  for (const key of requiredPilotCountKeys) {
    const expected = evidence?.expectedCounts?.[key];
    const actual = evidence?.actualCounts?.[key];
    if (!Number.isInteger(expected) || expected < 1 || expected !== actual) {
      errors.push(`count ${key} must be positive and equal`);
    }
  }
  return { valid: errors.length === 0, errors };
}
