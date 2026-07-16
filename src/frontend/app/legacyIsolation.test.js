import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/frontend/app/LegacyApp.jsx", "utf8");

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

  it("keeps external matrix document links available", () => {
    expect(source).toContain("matrixDocumentLinks");
    expect(source).toContain("Открыть шахматку");
  });
});
