import { describe, expect, it } from "vitest";
import { applyTemplateToBuilding, generateFloorTemplateDraft } from "./floorTemplate";

describe("floor template domain", () => {
  it("generates apartments and MOP doors with stable labels", () => {
    const draft = generateFloorTemplateDraft("building-1", 6, 2);

    expect(draft.rooms).toHaveLength(6);
    expect(draft.doors).toHaveLength(8);
    expect(draft.doors[0]).toMatchObject({ label: "Квартира 1", mark: "Д-1", type: "Квартирная" });
    expect(draft.doors.at(-1)).toMatchObject({ label: "2 МОП", mark: "2 МОП", type: "МОП" });
  });

  it("applies independent door copies only to real floors", () => {
    const draft = generateFloorTemplateDraft("building-1", 2, 1);
    const template = { ...draft, image: "", imageStorageUri: undefined };
    const building = {
      id: "building-1",
      floors: [
        { id: "floor-1", type: "floor", doors: [] },
        { id: "floor-2", type: "floor", doors: [] },
        { id: "roof", type: "service", doors: [] },
      ],
    };

    const result = applyTemplateToBuilding(building, template);
    expect(result.doorsPerFloor).toBe(3);
    expect(result.floors[0].doors).toHaveLength(3);
    expect(result.floors[1].doors).toHaveLength(3);
    expect(result.floors[2].doors).toEqual([]);
    expect(result.floors[0].doors[0].id).not.toBe(result.floors[1].doors[0].id);
    expect(result.floors[0].doors[0].history).not.toBe(result.floors[1].doors[0].history);
  });
});
