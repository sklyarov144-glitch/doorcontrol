import { describe, expect, it } from "vitest";
import { groupReportRows, reportMetrics, reportRowsFromObjects } from "./reports";

const objects = [{
  id: "object-1",
  name: "ЖК Матвеевский парк",
  buildings: [{
    id: "building-1",
    name: "Корпус 4.1",
    floors: [
      { id: "floor-8", type: "floor", number: 8, doors: [
        { id: "door-1", doorStatus: "смонтирована", storageAct: "не передана", issue: "есть замечание" },
        { id: "door-2", doorStatus: "передано по акту", storageAct: "передано по акту", issue: "нет" },
      ] },
      { id: "roof", type: "roof", number: "Кровля", doors: [{ id: "roof-door", doorStatus: "смонтирована" }] },
    ],
  }],
}];

describe("production installation reports", () => {
  it("builds rows only from real floors", () => {
    const rows = reportRowsFromObjects(objects);
    expect(rows.map((row) => row.doorId)).toEqual(["door-1", "door-2"]);
    expect(rows[1]).toMatchObject({ mounted: true, accepted: true, custody: true });
  });

  it("calculates management metrics from the current door state", () => {
    expect(reportMetrics(reportRowsFromObjects(objects))).toEqual({
      total: 2,
      mounted: 2,
      accepted: 1,
      custody: 1,
      issues: 1,
      readiness: 100,
    });
  });

  it("groups rows by backend hierarchy labels", () => {
    expect(groupReportRows(reportRowsFromObjects(objects), "building")[0][0]).toBe("Корпус 4.1");
  });
});
