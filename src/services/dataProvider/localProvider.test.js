import { beforeEach, describe, expect, it } from "vitest";
import { localProvider } from "./localProvider";

describe("localProvider", () => {
  beforeEach(() => localStorage.clear());

  it("stores large collections in a compressed backward-compatible format", () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: `object-${index}`,
      name: `Объект ${index}`,
      repeatedPayload: "монтаж-дверей-".repeat(100),
    }));

    localProvider.objects.replaceAll(rows);

    expect(localStorage.getItem("gross-lean-montage.visual.mvp.v7")).toMatch(/^gross-lz:/);
    expect(localProvider.objects.getAll()).toEqual(rows);
  });

  it("continues to read existing uncompressed MVP data", () => {
    const rows = [{ id: "legacy-object", name: "Старый объект" }];
    localStorage.setItem("gross-lean-montage.visual.mvp.v7", JSON.stringify(rows));
    expect(localProvider.objects.getAll()).toEqual(rows);
  });
});
