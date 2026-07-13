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
    expect(result.counts).toEqual({ objects: 1, buildings: 1, floors: 1, doors: 1 });
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
});
