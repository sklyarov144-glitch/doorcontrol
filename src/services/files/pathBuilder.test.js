import { describe, expect, it } from "vitest";
import { buildAvatarPath, buildDocumentPath, buildFloorPlanPath } from "./pathBuilder";

describe("storage paths", () => {
  it("keeps company and object scope in document paths", () => {
    expect(buildDocumentPath({ companyId: "company", objectId: "object", fileName: "Акт.PDF", fileId: "file" }))
      .toBe("company/object/file.pdf");
  });

  it("builds scoped floor plan and private avatar paths", () => {
    expect(buildFloorPlanPath({ companyId: "c", objectId: "o", buildingId: "b", floorId: "f", fileName: "plan.png", fileId: "id" }))
      .toBe("c/o/b/f/id.png");
    expect(buildAvatarPath({ userId: "user", fileName: "avatar.webp", fileId: "id" }))
      .toBe("user/id.webp");
  });

  it("rejects path traversal through identifiers", () => {
    expect(() => buildDocumentPath({ companyId: "../company", objectId: "object", fileName: "x.pdf" })).toThrow();
  });
});

