import { describe, expect, it } from "vitest";
import { allObjectDoors, buildingReadiness, objectMetrics, visibleObjectsForUser, visibleUsersForManager } from "./objectAccess";

const objects = [{
  id: "object-1",
  responsibleDirectorId: "director-1",
  buildings: [
    { id: "building-1", responsibleItrId: "itr-1", floors: [{ doors: [{ doorStatus: "смонтирована", issue: "нет", openingStatus: "готов" }] }] },
    { id: "building-2", responsibleItrId: "itr-2", floors: [{ doors: [{ doorStatus: "не начато", issue: "есть замечание", openingStatus: "требует корректировки" }] }] },
  ],
}, {
  id: "object-2",
  responsibleDirectorId: "director-2",
  buildings: [{ id: "building-3", responsibleItrId: "itr-3", floors: [] }],
}];

describe("object access and metrics", () => {
  it("keeps the full company scope for creator and company head", () => {
    expect(visibleObjectsForUser({ role: "creator" }, objects)).toHaveLength(2);
    expect(visibleObjectsForUser({ role: "company_head" }, objects)).toHaveLength(2);
  });

  it("limits a director to assigned objects", () => {
    expect(visibleObjectsForUser({ id: "director-1", role: "construction_director" }, objects).map((item) => item.id)).toEqual(["object-1"]);
  });

  it("limits an ITR to assigned buildings without exposing siblings", () => {
    const [object] = visibleObjectsForUser({ id: "itr-1", role: "itr", assignedObjectIds: [], assignedBuildingIds: [] }, objects);
    expect(object.id).toBe("object-1");
    expect(object.buildings.map((item) => item.id)).toEqual(["building-1"]);
  });

  it("returns only the director and ITR users from the director scope", () => {
    const users = [
      { id: "director-1", role: "construction_director" },
      { id: "itr-1", role: "itr", assignedObjectIds: ["object-1"] },
      { id: "itr-3", role: "itr", assignedObjectIds: ["object-2"] },
      { id: "head", role: "company_head" },
    ];
    expect(visibleUsersForManager(users[0], users, objects).map((item) => item.id)).toEqual(["director-1", "itr-1"]);
  });

  it("calculates readiness, issues and opening corrections from one door set", () => {
    expect(allObjectDoors(objects[0])).toHaveLength(2);
    expect(objectMetrics(objects[0])).toEqual({ readiness: 50, issues: 1, openingsOnCorrection: 1 });
    expect(buildingReadiness(objects[0].buildings[0])).toBe(100);
    expect(buildingReadiness({ floors: [] })).toBe(0);
  });
});
