import { describe, expect, it } from "vitest";
import { createEmptyBuilding, createFloorStructure, resizeBuildingFloors } from "./objectFactory";

describe("objectFactory", () => {
  it("creates exactly the requested number of empty floors", () => {
    const building = createEmptyBuilding({
      id: "building-11",
      objectId: "object-1",
      name: "Корпус 4.1",
      floorsCount: 11,
      doorsPerFloor: 6,
    }, new Date("2026-07-16T08:00:00.000Z"));

    expect(building.floorsCount).toBe(11);
    expect(building.floors.filter((floor) => floor.type === "floor")).toHaveLength(11);
    expect(building.floors.flatMap((floor) => floor.doors)).toEqual([]);
    expect(building.floors.at(-1)).toMatchObject({ id: "roof", label: "Кровля" });
  });

  it("supports an optional parking level without counting it as a floor", () => {
    const floors = createFloorStructure(2, { includeParking: true });

    expect(floors.map((floor) => floor.id)).toEqual([
      "parking",
      "floor-1",
      "floor-2",
      "roof",
    ]);
  });

  it("preserves existing doors, parking and roof while resizing", () => {
    const original = {
      floors: [
        { id: "parking", type: "parking", doors: [{ id: "parking-door" }] },
        { id: "floor-1", number: 1, type: "floor", doors: [{ id: "door-1" }] },
        { id: "floor-2", number: 2, type: "floor", doors: [] },
        { id: "roof", type: "service", doors: [] },
      ],
    };

    const floors = resizeBuildingFloors(original, 3);

    expect(floors.map((floor) => floor.id)).toEqual([
      "parking",
      "floor-1",
      "floor-2",
      "floor-3",
      "roof",
    ]);
    expect(floors.find((floor) => floor.id === "floor-1").doors).toEqual([{ id: "door-1" }]);
    expect(floors.find((floor) => floor.id === "floor-3").doors).toEqual([]);
  });
});
