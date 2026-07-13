import { describe, expect, it } from "vitest";
import { mapObjectTree } from "./supabaseProvider";

describe("Supabase object tree", () => {
  it("maps relational rows to the visual hierarchy and restores service levels", () => {
    const [object] = mapObjectTree([{
      id: "object-uuid",
      name: "ЖК Матвеевский парк",
      meta: { developer: "ПИК" },
      buildings: [{
        id: "building-uuid",
        name: "Корпус 4.1",
        floorsCount: 1,
        hasParking: true,
        floorTemplate: {},
        floors: [{
          id: "floor-uuid",
          floorNumber: 1,
          templateSnapshot: {},
          doors: [{
            id: "door-uuid",
            label: "Квартира 1",
            mark: "Д-1",
            status: "смонтирована",
            openingStatus: "готов",
            issueStatus: "нет",
            custodyActStatus: "не передана",
            meta: { swing: "down-right" },
          }],
        }],
      }],
    }]);

    expect(object.developer).toBe("ПИК");
    expect(object.buildings[0].floors.map((floor) => floor.label)).toEqual([
      "Паркинг",
      "1",
      "Кровля",
    ]);
    expect(object.buildings[0].floors[1].doors[0]).toMatchObject({
      number: "Квартира 1",
      doorStatus: "смонтирована",
      storageAct: "не передана",
      swing: "down-right",
    });
  });
});

