import { describe, expect, it } from "vitest";
import { buildCustodyRows, custodyStats } from "./custodyControl";

const objects = [{
  id: "object-1",
  name: "Объект",
  buildings: [{
    id: "building-1",
    name: "Корпус",
    responsibleItrId: "itr-1",
    floors: [{ id: "floor-1", number: 1, type: "floor", doors: [
      { id: "door-1", number: "Квартира 1", doorStatus: "смонтирована", mountedAt: "2026-07-10T12:00:00Z" },
      { id: "door-2", number: "Квартира 2", doorStatus: "передано по акту", mountedAt: "2026-07-08T12:00:00Z" },
      { id: "door-3", number: "Квартира 3", doorStatus: "не начато" },
    ] }],
  }],
}];

describe("custody act control", () => {
  it("uses real milestones, normalized acts and linked documents", () => {
    const rows = buildCustodyRows({
      objects,
      acts: [
        { id: "act-1", doorId: "door-1", status: "акт загружен", documentId: "doc-1" },
        { id: "act-2", doorId: "door-2", status: "закрыто" },
      ],
      documents: [{ id: "doc-1", url: "https://disk.example/act" }],
      users: [{ id: "itr-1", name: "Инженер" }],
      now: new Date("2026-07-15T12:00:00Z"),
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ days: 5, overdue: true, custodyActUrl: "https://disk.example/act", responsible: "Инженер" });
    expect(rows[1]).toMatchObject({ days: 0, closed: true });
    expect(custodyStats(rows)).toEqual({ mounted: 2, closed: 1, open: 1, overdue: 1, closeRate: 50 });
  });
});
