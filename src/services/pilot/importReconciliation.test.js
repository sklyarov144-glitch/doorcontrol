import { describe, expect, it } from "vitest";
import {
  createPilotReconciliationEvidence,
  reconcilePilotImport,
  validatePilotReconciliationEvidence,
} from "./importReconciliation";

const payload = {
  objects: [{
    legacyId: "object-1", name: "ЖК Тест", responsibleDirectorId: "director-1",
    buildings: [{
      legacyId: "building-1", name: "Корпус 1", floorsCount: 1, responsibleItrId: "itr-1",
      floors: [{
        legacyId: "floor-1", number: 1,
        doors: [{ legacyId: "door-1", label: "Квартира 1", mark: "Д-1", type: "apartment", openingNumber: 1, x: 20, y: 30 }],
      }],
    }],
  }],
};

const actual = {
  objects: [{ legacyId: "object-1", name: "ЖК Тест", address: null, district: null, metro: null, status: "В работе", responsibleDirectorId: "director-1" }],
  buildings: [{ legacyId: "building-1", objectLegacyId: "object-1", name: "Корпус 1", floorsCount: 1, hasParking: false, readiness: 0, responsibleItrId: "itr-1" }],
  floors: [{ legacyId: "floor-1", buildingLegacyId: "building-1", number: 1, planImageUrl: null }],
  doors: [{
    legacyId: "door-1", floorLegacyId: "floor-1", label: "Квартира 1", mark: "Д-1", type: "apartment",
    openingNumber: 1, status: "не начато", openingStatus: "готов", issueStatus: "нет",
    custodyActStatus: "не передана", tnStatus: "не передано", assignedUserId: null, x: 20, y: 30,
    model: null, widthFact: null, heightFact: null,
    mountedAt: null, tnAcceptedAt: null, custodyActUploadedAt: null, custodyActClosedAt: null,
  }],
};

describe("pilot import reconciliation", () => {
  it("accepts an exact imported hierarchy", () => {
    const result = reconcilePilotImport(payload, actual);
    expect(result.valid).toBe(true);
    expect(result.actualCounts).toEqual({ objects: 1, buildings: 1, floors: 1, doors: 1 });
  });

  it("reports missing rows and field mismatches", () => {
    const changed = structuredClone(actual);
    changed.buildings[0].floorsCount = 25;
    changed.doors = [];
    const result = reconcilePilotImport(payload, changed);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("expected 1, received 25");
    expect(result.errors.join(" ")).toContain("doors door-1 is missing");
  });

  it("rejects stale rows left under an imported hierarchy", () => {
    const changed = structuredClone(actual);
    changed.floors.push({ legacyId: "floor-extra", buildingLegacyId: "building-1", number: 2, planImageUrl: null });
    const result = reconcilePilotImport(payload, changed);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("floors floor-extra was not present");
  });

  it("normalizes equivalent workflow timestamp formats", () => {
    const datedPayload = structuredClone(payload);
    datedPayload.objects[0].buildings[0].floors[0].doors[0].mountedAt = "2026-07-10T08:00:00Z";
    const datedActual = structuredClone(actual);
    datedActual.doors[0].mountedAt = "2026-07-10T11:00:00+03:00";

    expect(reconcilePilotImport(datedPayload, datedActual).valid).toBe(true);
  });

  it("creates release-bound evidence only for exact non-empty reconciliation", () => {
    const reconciliation = reconcilePilotImport(payload, actual);
    const evidence = createPilotReconciliationEvidence({
      releaseSha: "a".repeat(40),
      supabaseProjectId: "abcdefghijklmnopqrst",
      companyId: "company-1",
      sourceSha256: "b".repeat(64),
      generatedAt: "2026-07-15T10:00:00Z",
      reconciliation,
    });
    expect(validatePilotReconciliationEvidence(evidence, "a".repeat(40), {
      now: new Date("2026-07-16T10:00:00Z"),
    }).valid).toBe(true);
    expect(() => createPilotReconciliationEvidence({
      releaseSha: "a".repeat(40),
      supabaseProjectId: "abcdefghijklmnopqrst",
      companyId: "company-1",
      sourceSha256: "b".repeat(64),
      reconciliation: { ...reconciliation, valid: false },
    })).toThrow("successful reconciliation");
  });
});
