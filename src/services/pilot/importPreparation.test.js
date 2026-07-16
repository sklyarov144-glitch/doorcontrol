import { describe, expect, it } from "vitest";
import { preparePilotImport } from "./importPreparation";

const assignments = {
  director: "11111111-1111-4111-8111-111111111111",
  itr_one: "22222222-2222-4222-8222-222222222222",
};

const source = {
  objects: [{
    responsibleDirectorKey: "director",
    buildings: [{
      responsibleItrKey: "itr_one",
      floors: [{ doors: [{ assignedUserKey: "itr_one" }] }],
    }],
  }],
};

describe("pilot import preparation", () => {
  it("resolves verified user keys without mutating the source", () => {
    const result = preparePilotImport(source, assignments);

    expect(result.valid).toBe(true);
    expect(result.payload.objects[0]).toMatchObject({ responsibleDirectorId: assignments.director });
    expect(result.payload.objects[0].buildings[0]).toMatchObject({ responsibleItrId: assignments.itr_one });
    expect(result.payload.objects[0].buildings[0].floors[0].doors[0]).toMatchObject({ assignedUserId: assignments.itr_one });
    expect(result.payload.objects[0].responsibleDirectorKey).toBeUndefined();
    expect(source.objects[0].responsibleDirectorKey).toBe("director");
  });

  it("rejects unknown assignment keys", () => {
    const changed = structuredClone(source);
    changed.objects[0].buildings[0].responsibleItrKey = "missing_itr";

    const result = preparePilotImport(changed, assignments);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("unknown assignment missing_itr");
  });

  it("rejects ambiguous key and UUID fields", () => {
    const changed = structuredClone(source);
    changed.objects[0].responsibleDirectorId = assignments.director;

    const result = preparePilotImport(changed, assignments);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("cannot contain both responsibleDirectorKey and responsibleDirectorId");
  });

  it("rejects invalid assignment UUIDs", () => {
    const result = preparePilotImport(source, { ...assignments, director: "director-legacy-id" });

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("resolved to an invalid UUID");
  });
});
