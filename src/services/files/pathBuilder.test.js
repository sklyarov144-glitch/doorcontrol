import { describe, expect, it } from "vitest";
import { buildAvatarPath, buildDocumentPath, buildFloorPlanPath } from "./pathBuilder";

describe("storage paths", () => {
  it("keeps the complete domain scope in document paths", () => {
    expect(buildDocumentPath({ companyId: "company", objectId: "object", fileName: "Акт.PDF", fileId: "file" }))
      .toBe("company/object/_/_/_/file.pdf");
    expect(buildDocumentPath({
      companyId: "company", objectId: "object", buildingId: "building", floorId: "floor", doorId: "door",
      fileName: "Акт.PDF", fileId: "file",
    })).toBe("company/object/building/floor/door/file.pdf");
  });

  it("rejects incomplete document hierarchies", () => {
    expect(() => buildDocumentPath({ companyId: "c", objectId: "o", floorId: "f", fileName: "x.pdf" }))
      .toThrow("floorId requires buildingId");
    expect(() => buildDocumentPath({ companyId: "c", objectId: "o", buildingId: "b", doorId: "d", fileName: "x.pdf" }))
      .toThrow("doorId requires floorId and buildingId");
  });

  it("builds scoped floor plan and private avatar paths", () => {
    expect(buildFloorPlanPath({ companyId: "c", objectId: "o", buildingId: "b", floorId: "f", fileName: "plan.png", fileId: "id" }))
      .toBe("c/o/b/f/id.png");
    expect(buildAvatarPath({ userId: "user", fileName: "avatar.webp", fileId: "id" }))
      .toBe("user/id.webp");
  });

  it("rejects path traversal through identifiers", () => {
    expect(() => buildDocumentPath({ companyId: "../company", objectId: "object", fileName: "x.pdf" })).toThrow();
    expect(() => buildDocumentPath({ companyId: "company", objectId: "object", fileName: "x.pdf", fileId: "../file" })).toThrow();
    expect(() => buildAvatarPath({ userId: "user\\other", fileName: "avatar.png" })).toThrow();
  });
});
