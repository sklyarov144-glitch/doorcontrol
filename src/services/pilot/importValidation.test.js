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
});
