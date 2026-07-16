import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/frontend/app/LegacyApp.jsx", "utf8");
const documentsSource = readFileSync("src/frontend/pages/DocumentsPage.jsx", "utf8");

describe("legacy production isolation", () => {
  it("does not initialize or expose the removed internal matrix editor", () => {
    for (const forbidden of [
      "DoorMatrixPage",
      "doorMatrix, setDoorMatrix",
      "updateMatrixCell",
      "replaceDoorMatrix",
      "MATRIX_COLUMNS_KEY",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("isolates external matrix links in the documents module", () => {
    expect(source).not.toContain("matrixDocumentLinks");
    expect(source).not.toContain("gross-lean-montage.matrix-documents.v1");
    expect(documentsSource).toContain("initialMatrixLinks");
    expect(documentsSource).toContain("Открыть шахматку");
  });
});
