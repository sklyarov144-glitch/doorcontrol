import { describe, expect, it } from "vitest";
import { buildAppPath, parseAppRoute } from "./routes";

describe("application routes", () => {
  it("builds and parses the complete ITR door route", () => {
    const path = buildAppPath("door", {
      objectId: "object-1",
      buildingId: "building-1",
      floorId: "floor-8",
      doorId: "door-3",
    });
    expect(path).toBe("/objects/object-1/buildings/building-1/floors/floor-8/doors/door-3");
    expect(parseAppRoute(path)).toEqual({
      screen: "door",
      objectId: "object-1",
      buildingId: "building-1",
      floorId: "floor-8",
      doorId: "door-3",
    });
  });

  it("supports all top-level production routes", () => {
    expect(parseAppRoute("/dashboard").screen).toBe("company_dashboard");
    expect(parseAppRoute("/tasks").screen).toBe("tasks");
    expect(parseAppRoute("/admin").screen).toBe("admin");
    expect(parseAppRoute("/finance").screen).toBe("finance");
  });
});
