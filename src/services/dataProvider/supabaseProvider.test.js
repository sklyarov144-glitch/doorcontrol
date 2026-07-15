import { describe, expect, it } from "vitest";
import { mapObjectTree, mapProfileAssignments, toDoorOperationalUpdate, toDoorWorkflowPayload, toStoredFloorTemplate } from "./supabaseProvider";

describe("Supabase object tree", () => {
  it("maps profile assignments to UI access lists", () => {
    expect(mapProfileAssignments({
      id: "user-1",
      objectAssignments: [{ objectId: "object-1" }],
      buildingAssignments: [{ buildingId: "building-1" }],
    })).toMatchObject({
      assignedObjectIds: ["object-1"],
      assignedBuildingIds: ["building-1"],
    });
  });

  it("maps a UI door to one safe operational update", () => {
    expect(toDoorOperationalUpdate({
      number: "Квартира 1",
      mark: "Д-1",
      type: "Квартирная",
      doorStatus: "смонтирована",
      openingStatus: "готов",
      issue: "нет",
      storageAct: "не передана",
      x: 25,
      y: 40,
      history: [{ text: "Статус изменён" }],
    })).toMatchObject({
      label: "Квартира 1",
      status: "смонтирована",
      openingStatus: "готов",
      issueStatus: "нет",
      custodyActStatus: "не передана",
      meta: { history: [{ text: "Статус изменён" }] },
    });
  });

  it("builds one atomic RPC payload for the door and its TN issue", () => {
    expect(toDoorWorkflowPayload("door-1", {
      number: "Квартира 1",
      mark: "Д-1",
      type: "Квартирная",
      doorStatus: "смонтирована",
      openingStatus: "готов",
      issue: "есть замечание",
      storageAct: "не передана",
      x: 20,
      y: 30,
    }, {
      title: "Замечание ТН",
      responsibleId: "user-1",
      resolvedAt: null,
    })).toMatchObject({
      p_door_id: "door-1",
      p_door: {
        label: "Квартира 1",
        status: "смонтирована",
        issue_status: "есть замечание",
      },
      p_issue: {
        title: "Замечание ТН",
        responsible_id: "user-1",
        resolved_at: null,
      },
    });
  });

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

  it("persists the stable floor-plan storage URI instead of a signed URL", () => {
    expect(toStoredFloorTemplate({
      image: "https://signed.example/floor.png?token=temporary",
      imageStorageUri: "storage://floor-plans/company/object/building/floor/plan.png",
      rooms: [{ id: "room-1" }],
    })).toEqual({
      image: "storage://floor-plans/company/object/building/floor/plan.png",
      rooms: [{ id: "room-1" }],
    });
  });
});
