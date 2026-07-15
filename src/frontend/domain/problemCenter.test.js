import { describe, expect, it } from "vitest";
import { calculateRemoteProblems, problemStats } from "./problemCenter";

const now = new Date("2026-07-15T12:00:00Z");
const objects = [{
  id: "object-1",
  name: "Объект",
  responsibleDirectorId: "director-1",
  buildings: [{
    id: "building-1",
    name: "Корпус",
    responsibleItrId: "itr-1",
    floors: [{
      id: "floor-1",
      number: 1,
      type: "floor",
      doors: [{
        id: "door-1",
        number: "Квартира 1",
        doorStatus: "смонтирована",
        storageAct: "не передана",
        openingStatus: "требует корректировки",
        issue: "есть замечание",
        mountedAt: "2026-07-10T12:00:00Z",
        updatedAt: "2026-07-05T12:00:00Z",
      }],
    }],
  }],
}];

describe("production problem center", () => {
  it("calculates risks from persisted dates and normalized records", () => {
    const problems = calculateRemoteProblems({
      objects,
      documents: [{ objectId: "object-1", buildingId: "building-1" }],
      custodyActs: [{ doorId: "door-1", status: "не передана" }],
      tnIssues: [{ doorId: "door-1", status: "открыто", createdAt: "2026-07-12T12:00:00Z" }],
      now,
    });
    expect(problems.map((item) => item.type)).toEqual(expect.arrayContaining([
      "Просроченные двери",
      "Смонтировано без акта ОХ",
      "Замечания ТН",
      "Проёмы под риск",
      "Зависшие статусы",
    ]));
    expect(problems.find((item) => item.type === "Смонтировано без акта ОХ")).toMatchObject({ days: 5, priority: "высокий" });
  });

  it("does not report a closed act or resolved TN issue", () => {
    const cleanObjects = structuredClone(objects);
    cleanObjects[0].buildings[0].floors[0].doors[0] = {
      ...cleanObjects[0].buildings[0].floors[0].doors[0],
      doorStatus: "передано по акту",
      storageAct: "передано по акту",
      openingStatus: "готов",
      issue: "устранено",
    };
    const problems = calculateRemoteProblems({
      objects: cleanObjects,
      documents: [{ buildingId: "building-1" }],
      custodyActs: [{ doorId: "door-1", status: "закрыто" }],
      tnIssues: [{ doorId: "door-1", status: "устранено" }],
      now,
    });
    expect(problems).toEqual([]);
  });

  it("summarizes management indicators", () => {
    expect(problemStats([
      { type: "Просроченные двери" },
      { type: "Замечания ТН" },
      { type: "Смонтировано без акта ОХ" },
      { type: "Проёмы под риск" },
    ])).toEqual({ total: 4, overdue: 1, tnIssues: 1, noCustodyAct: 1, riskyOpenings: 1 });
  });
});
