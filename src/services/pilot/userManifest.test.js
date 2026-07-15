import { describe, expect, it } from "vitest";
import { reconcilePilotUsers, validatePilotUserManifest } from "./userManifest";

const manifest = {
  users: [
    { key: "head", email: "head@example.ru", name: "Head", role: "company_head" },
    { key: "director", email: "director@example.ru", name: "Director", role: "construction_director" },
    { key: "itr_one", email: "itr1@example.ru", name: "ITR 1", role: "itr" },
    { key: "itr_two", email: "itr2@example.ru", name: "ITR 2", role: "itr" },
  ],
};

describe("pilot user manifest", () => {
  it("requires the complete pilot role composition", () => {
    expect(validatePilotUserManifest(manifest).valid).toBe(true);
    const incomplete = structuredClone(manifest);
    incomplete.users.pop();
    expect(validatePilotUserManifest(incomplete).errors).toContain("at least two itr users are required for the pilot");
  });

  it("rejects duplicate identities", () => {
    const duplicate = structuredClone(manifest);
    duplicate.users[3].email = duplicate.users[2].email;
    expect(validatePilotUserManifest(duplicate).valid).toBe(false);
  });

  it("exports UUID assignments only for active matching profiles", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const profiles = manifest.users.map((user, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index}`,
      email: user.email, role: user.role, company_id: companyId, status: "active",
    }));
    const result = reconcilePilotUsers(manifest, profiles, companyId);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.assignments)).toEqual(["head", "director", "itr_one", "itr_two"]);
  });

  it("reports unactivated and role-mismatched accounts", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const result = reconcilePilotUsers(manifest, [{
      id: "1", email: "head@example.ru", role: "itr", company_id: companyId, status: "active",
    }], companyId);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/expected role|has not activated/);
  });
});
