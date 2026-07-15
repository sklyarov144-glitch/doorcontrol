import { describe, expect, it } from "vitest";
import { applyDoorWorkflow, deriveDoorValues } from "./doorWorkflow";

const source = [{
  id: "object-1",
  buildings: [{
    id: "building-1",
    floors: [{
      id: "floor-1",
      doors: [{
        id: "door-1",
        doorStatus: "не начато",
        openingStatus: "готов",
        issue: "нет",
        storageAct: "не передана",
        history: [],
      }],
    }],
  }],
}];

describe("door workflow domain", () => {
  it("derives visual statuses from operational flags", () => {
    expect(deriveDoorValues({
      doorStatus: "не начато",
      issue: "нет",
      storageAct: "не передана",
      installed: "Да",
      tnIssues: "Да",
      custodyAct: "Да",
    })).toMatchObject({
      doorStatus: "смонтирована",
      issue: "есть замечание",
      storageAct: "передано по акту",
    });
  });

  it("records milestones and one readable history event without mutating the source", () => {
    const now = new Date("2026-07-15T08:30:00.000Z");
    const result = applyDoorWorkflow(source, "door-1", {
      doorStatus: "смонтирована",
      openingStatus: "готов",
      issue: "нет",
      storageAct: "не передана",
      quickHistory: "Монтаж подтверждён",
    }, "Инженер", now);

    expect(result.updatedDoor).toMatchObject({
      doorStatus: "смонтирована",
      mountedAt: "2026-07-15",
    });
    expect(result.updatedDoor.history[0]).toMatchObject({
      id: `door-1-${now.getTime()}`,
      user: "Инженер",
    });
    expect(result.updatedDoor.history[0].text).toContain("Статус двери");
    expect(result.updatedDoor.history[0].text).toContain("Монтаж подтверждён");
    expect(source[0].buildings[0].floors[0].doors[0].doorStatus).toBe("не начато");
  });

  it("returns no door when the id is outside the loaded access scope", () => {
    expect(applyDoorWorkflow(source, "missing", {}, "Инженер").updatedDoor).toBeNull();
  });
});
