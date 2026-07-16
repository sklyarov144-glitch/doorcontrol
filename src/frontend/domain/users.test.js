import { describe, expect, it } from "vitest";
import { assignableRoles, canAssignRole, normalizeUser } from "./users";

describe("user domain", () => {
  it("normalizes nullable account fields and assignments", () => {
    expect(normalizeUser({ id: "user-1", companyId: "company-1", name: "Иван" })).toMatchObject({
      id: "user-1",
      companyId: "company-1",
      name: "Иван",
      role: "itr",
      status: "active",
      assignedObjectIds: [],
      assignedBuildingIds: [],
    });
  });

  it("does not let managers escalate roles beyond their authority", () => {
    expect(assignableRoles("creator")).toEqual(["creator", "company_head", "construction_director", "itr"]);
    expect(assignableRoles("company_head")).toEqual(["company_head", "construction_director", "itr"]);
    expect(assignableRoles("construction_director")).toEqual(["itr"]);
    expect(canAssignRole("itr", "itr")).toBe(false);
  });
});
