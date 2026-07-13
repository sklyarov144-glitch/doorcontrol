import { describe, expect, it } from "vitest";
import { canCreate, canManageObjects, canManageUsers, canView } from "./permissions";

const user = (role) => ({ id: role, role });

describe("role permissions", () => {
  it("keeps administrative sections unavailable to ITR", () => {
    expect(canView(user("itr"), "admin")).toBe(false);
    expect(canManageUsers(user("itr"))).toBe(false);
    expect(canManageObjects(user("itr"))).toBe(false);
  });

  it("allows management roles to manage users", () => {
    for (const role of ["creator", "company_head", "construction_director"]) {
      expect(canManageUsers(user(role))).toBe(true);
      expect(canView(user(role), "admin")).toBe(true);
    }
  });

  it("allows only creator and company head to create objects", () => {
    expect(canCreate(user("creator"), "object")).toBe(true);
    expect(canCreate(user("company_head"), "object")).toBe(true);
    expect(canCreate(user("construction_director"), "object")).toBe(false);
    expect(canCreate(user("itr"), "object")).toBe(false);
  });
});
