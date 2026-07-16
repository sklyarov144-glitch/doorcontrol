import { describe, expect, it } from "vitest";
import {
  storageLocationFromUri,
  validateStorageFile,
  validateStorageLocation,
} from "./filePolicy";

describe("storage file policy", () => {
  it("accepts only a supported MIME and matching extension", () => {
    expect(validateStorageFile(new File(["plan"], "plan.PNG", { type: "image/png" }), "floor-plans"))
      .toBe(true);
    expect(() => validateStorageFile(new File(["svg"], "plan.svg", { type: "image/svg+xml" }), "floor-plans"))
      .toThrow("Формат файла не поддерживается");
    expect(() => validateStorageFile(new File(["fake"], "plan.pdf", { type: "image/png" }), "floor-plans"))
      .toThrow("Расширение файла не соответствует его формату");
  });

  it("rejects empty and oversized files before a network request", () => {
    expect(() => validateStorageFile(new File([], "empty.png", { type: "image/png" }), "avatars"))
      .toThrow("Файл пуст или повреждён");
    const oversized = new File(["x"], "avatar.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 5 * 1024 * 1024 + 1 });
    expect(() => validateStorageFile(oversized, "avatars"))
      .toThrow("Файл превышает допустимый размер");
  });

  it("allows only known buckets and traversal-free paths", () => {
    expect(validateStorageLocation("documents", "company/object/file.pdf")).toBe(true);
    expect(() => validateStorageLocation("public", "file.pdf")).toThrow("Неизвестное файловое хранилище");
    expect(() => validateStorageLocation("documents", "company/../file.pdf")).toThrow("Некорректный путь файла");
    expect(() => validateStorageLocation("documents", "/company/file.pdf")).toThrow("Некорректный путь файла");
  });

  it("parses private storage URIs and rejects forged locations", () => {
    expect(storageLocationFromUri("storage://documents/company/object/file.pdf")).toEqual({
      bucket: "documents",
      path: "company/object/file.pdf",
    });
    expect(storageLocationFromUri("https://example.test/file.pdf")).toBeNull();
    expect(() => storageLocationFromUri("storage://documents/company/../secret.pdf"))
      .toThrow("Некорректный путь файла");
  });
});

