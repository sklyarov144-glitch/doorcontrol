import { describe, expect, it } from "vitest";
import { validatePilotImport } from "./importValidation";

const validPayload = {
  objects: [{
    legacyId: "object-1",
    name: "ЖК Тест",
    buildings: [{
      legacyId: "building-1",
      name: "Корпус 1",
      floorsCount: 1,
      floors: [{
        legacyId: "floor-1",
        number: 1,
        doors: [{ legacyId: "door-1", label: "Квартира 1", mark: "Д-1", type: "apartment", openingNumber: 1, x: 20, y: 30 }],
      }],
    }],
  }],
};

describe("pilot import validation", () => {
  it("accepts a consistent hierarchy and reports counts", () => {
    const result = validatePilotImport(validPayload);
    expect(result.valid).toBe(true);
    expect(result.ready).toBe(false);
    expect(result.counts).toEqual({ objects: 1, buildings: 1, floors: 1, doors: 1 });
  });

  it("accepts building responsibility as a fallback for its doors", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].responsibleDirectorId = "11111111-1111-4111-8111-111111111111";
    payload.objects[0].buildings[0].responsibleItrId = "22222222-2222-4222-8222-222222222222";

    const result = validatePilotImport(payload);

    expect(result.valid).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("accepts a pilot subset while preserving the real building floor count", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].buildings[0].floorsCount = 25;
    const result = validatePilotImport(payload);
    expect(result.valid).toBe(true);
    expect(result.counts.floors).toBe(1);
  });

  it("rejects floors outside the declared building range", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].buildings[0].floors[0].number = 2;
    const result = validatePilotImport(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("from 1 to floorsCount");
  });

  it("rejects duplicate ids, floor marks and invalid coordinates", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].buildings[0].floors[0].doors.push({
      legacyId: "door-1", label: "Квартира 2", mark: "Д-1", type: "apartment", openingNumber: 1, x: 120, y: 30,
    });
    const result = validatePilotImport(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/duplicates legacy id|duplicates Д-1|percentages/);
  });

  it("rejects legacy user identifiers in production assignment fields", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].responsibleDirectorId = "director-1";
    payload.objects[0].buildings[0].responsibleItrId = "itr-1";
    payload.objects[0].buildings[0].floors[0].doors[0].assignedUserId = "itr-1";

    const result = validatePilotImport(payload);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/responsibleDirectorId must be a UUID/);
    expect(result.errors.join(" ")).toMatch(/responsibleItrId must be a UUID/);
    expect(result.errors.join(" ")).toMatch(/assignedUserId must be a UUID/);
  });

  it("accepts consistent workflow dates for an installed door", () => {
    const payload = structuredClone(validPayload);
    payload.objects[0].responsibleDirectorId = "11111111-1111-4111-8111-111111111111";
    payload.objects[0].buildings[0].responsibleItrId = "22222222-2222-4222-8222-222222222222";
    Object.assign(payload.objects[0].buildings[0].floors[0].doors[0], {
      status: "передано по акту",
      tnStatus: "принято ТН",
      custodyActStatus: "передано по акту",
      mountedAt: "2026-07-10T08:00:00Z",
      tnAcceptedAt: "2026-07-11T08:00:00Z",
      custodyActUploadedAt: "2026-07-11T09:00:00Z",
      custodyActClosedAt: "2026-07-12T08:00:00Z",
      widthFact: 980,
      heightFact: 2100,
    });

    const result = validatePilotImport(payload);

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("rejects unsupported statuses, invalid dimensions and reversed workflow dates", () => {
    const payload = structuredClone(validPayload);
    Object.assign(payload.objects[0].buildings[0].floors[0].doors[0], {
      status: "почти готово",
      openingStatus: "неизвестно",
      widthFact: -10,
      mountedAt: "2026-07-12T08:00:00Z",
      tnAcceptedAt: "2026-07-11T08:00:00Z",
    });

    const result = validatePilotImport(payload);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/status is unsupported/);
    expect(result.errors.join(" ")).toMatch(/openingStatus is unsupported/);
    expect(result.errors.join(" ")).toMatch(/widthFact must be a positive number/);
    expect(result.errors.join(" ")).toMatch(/tnAcceptedAt cannot precede mountedAt/);
  });

  it("warns when completed workflow statuses have no source dates", () => {
    const payload = structuredClone(validPayload);
    Object.assign(payload.objects[0].buildings[0].floors[0].doors[0], {
      status: "смонтирована",
      tnStatus: "принято ТН",
      custodyActStatus: "передано по акту",
    });

    const result = validatePilotImport(payload);

    expect(result.valid).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/without mountedAt/);
    expect(result.warnings.join(" ")).toMatch(/without tnAcceptedAt/);
    expect(result.warnings.join(" ")).toMatch(/without custodyActUploadedAt/);
    expect(result.warnings.join(" ")).toMatch(/without custodyActClosedAt/);
  });
});
