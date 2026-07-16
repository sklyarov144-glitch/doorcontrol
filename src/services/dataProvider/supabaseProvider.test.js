import { describe, expect, it } from "vitest";
import { assembleObjectTreeRows, assembleTaskRows, mapObjectTree, mapProfileAssignments, normalizeMfaStatus, toDoorOperationalUpdate, toDoorWorkflowPayload, toHierarchyPayload, toStoredFloorTemplate } from "./supabaseProvider";

describe("Supabase object tree", () => {
  it("normalizes verified TOTP factors and assurance levels", () => {
    expect(normalizeMfaStatus(
      { currentLevel: "aal1", nextLevel: "aal2" },
      { totp: [{ id: "totp-1", factor_type: "totp", status: "verified" }] }
    )).toMatchObject({
      currentLevel: "aal1",
      nextLevel: "aal2",
      verifiedFactorId: "totp-1",
    });
  });

  it("assembles independently paginated hierarchy rows without dropping doors", () => {
    const rows = assembleObjectTreeRows(
      [{ id: "object-1", name: "Объект" }],
      [{ id: "building-1", objectId: "object-1", name: "Корпус" }],
      [{ id: "floor-1", buildingId: "building-1", floorNumber: 1 }],
      Array.from({ length: 1001 }, (_, index) => ({
        id: `door-${index + 1}`,
        floorId: "floor-1",
        label: `Квартира ${index + 1}`,
      }))
    );

    expect(rows[0].buildings[0].floors[0].doors).toHaveLength(1001);
    expect(rows[0].buildings[0].floors[0].doors.at(-1).id).toBe("door-1001");
  });

  it("assembles independently paginated task activity without truncation", () => {
    const tasks = assembleTaskRows(
      [{ id: "task-1", title: "Задача" }],
      Array.from({ length: 1001 }, (_, index) => ({ id: `comment-${index}`, taskId: "task-1" })),
      [{ id: "link-1", taskId: "task-1", title: "Акт" }]
    );

    expect(tasks[0].comments).toHaveLength(1001);
    expect(tasks[0].documentLinks).toEqual([{ id: "link-1", taskId: "task-1", title: "Акт" }]);
  });

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

  it("keeps linked door documents in the persisted metadata", () => {
    expect(toDoorOperationalUpdate({
      number: "Квартира 1",
      mark: "Д-1",
      type: "Квартирная",
      doorStatus: "смонтирована",
      openingStatus: "готов",
      issue: "нет",
      storageAct: "акт загружен",
      x: 20,
      y: 30,
      documentLinks: [{ id: "document-1", url: "https://disk.example/act" }],
    }).meta.documentLinks).toEqual([
      { id: "document-1", url: "https://disk.example/act" },
    ]);
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

  it("maps the UI hierarchy to one transactional payload", () => {
    const payload = toHierarchyPayload([{
      id: "object-legacy",
      name: "ЖК Матвеевский парк",
      developer: "ПИК",
      buildings: [{
        id: "building-legacy",
        name: "Корпус 4.1",
        floorTemplate: {
          image: "https://signed.example/temporary.png",
          imageStorageUri: "storage://floor-plans/company/object/building/template.png",
        },
        floors: [
          { id: "parking", label: "Паркинг", type: "service", doors: [] },
          {
            id: "floor-1",
            label: "1",
            number: 1,
            type: "floor",
            doors: [{
              id: "door-1",
              number: "Квартира 1",
              mark: "Д-1",
              type: "Квартирная",
              doorStatus: "смонтирована",
              openingStatus: "готов",
              issue: "нет",
              storageAct: "не передана",
              x: 25,
              y: 40,
              history: [{ text: "Монтаж завершён" }],
            }],
          },
          { id: "roof", label: "Кровля", type: "service", doors: [] },
        ],
      }],
    }]);

    expect(payload.objects[0]).toMatchObject({
      legacyId: "object-legacy",
      meta: { developer: "ПИК" },
    });
    expect(payload.objects[0].buildings[0]).toMatchObject({
      legacyId: "building-legacy",
      floorsCount: 1,
      hasParking: true,
      floorTemplate: {
        image: "storage://floor-plans/company/object/building/template.png",
      },
    });
    expect(payload.objects[0].buildings[0].floors).toHaveLength(1);
    expect(payload.objects[0].buildings[0].floors[0].doors[0]).toMatchObject({
      legacyId: "door-1",
      label: "Квартира 1",
      status: "смонтирована",
      meta: { history: [{ text: "Монтаж завершён" }] },
    });
  });
});
