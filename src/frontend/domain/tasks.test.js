import { describe, expect, it } from "vitest";
import { canSeeManualTask, getManualTaskNoticeCount, getTaskContext, isManualTaskOverdue } from "./tasks";

const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  buildings: [{
    id: "building-1",
    name: "Корпус 4.1",
    floors: [{ id: "floor-1", number: 8, doors: [{ id: "door-1", number: "Квартира 1", mark: "Д-1" }] }],
  }],
};

describe("manual task rules", () => {
  it("limits ITR visibility to assigned tasks", () => {
    expect(canSeeManualTask({ assignedTo: "itr-1" }, { id: "itr-1", role: "itr" })).toBe(true);
    expect(canSeeManualTask({ assignedTo: "itr-2" }, { id: "itr-1", role: "itr" })).toBe(false);
    expect(canSeeManualTask({}, { id: "head-1", role: "company_head" })).toBe(true);
  });

  it("counts only new or overdue visible tasks", () => {
    const tasks = [
      { assignedTo: "itr-1", status: "новая" },
      { assignedTo: "itr-1", status: "в работе", dueDate: "2026-01-01" },
      { assignedTo: "itr-1", status: "выполнена", dueDate: "2026-01-01" },
      { assignedTo: "itr-2", status: "новая" },
    ];
    expect(getManualTaskNoticeCount(tasks, { id: "itr-1", role: "itr" })).toBe(2);
    expect(isManualTaskOverdue(tasks[1], "2026-07-16")).toBe(true);
  });

  it("resolves the navigation context from production objects", () => {
    expect(getTaskContext([object], { objectId: "object-1", buildingId: "building-1", floorId: "floor-1", doorId: "door-1" })).toEqual({
      objectName: "ЖК Матвеевский парк",
      buildingName: "Корпус 4.1",
      floorName: "Этаж 8",
      doorName: "Квартира 1",
    });
  });
});
