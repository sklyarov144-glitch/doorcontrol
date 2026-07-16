import { describe, expect, it, vi } from "vitest";
import { persistUploadedFile } from "./uploadLifecycle";

describe("uploaded file lifecycle", () => {
  it("keeps an upload after metadata persistence succeeds", async () => {
    const uploaded = { bucket: "documents", path: "scope/file.pdf" };
    const remove = vi.fn();

    await expect(persistUploadedFile({
      upload: vi.fn().mockResolvedValue(uploaded),
      persist: vi.fn().mockResolvedValue({ id: "document-1" }),
      remove,
    })).resolves.toEqual({ id: "document-1" });
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes an unreferenced upload when metadata persistence fails", async () => {
    const uploaded = { bucket: "documents", path: "scope/file.pdf" };
    const persistenceError = new Error("database unavailable");
    const remove = vi.fn().mockResolvedValue(undefined);

    await expect(persistUploadedFile({
      upload: vi.fn().mockResolvedValue(uploaded),
      persist: vi.fn().mockRejectedValue(persistenceError),
      remove,
    })).rejects.toBe(persistenceError);
    expect(remove).toHaveBeenCalledWith(uploaded);
  });

  it("preserves the persistence error even if compensating cleanup fails", async () => {
    const persistenceError = new Error("database unavailable");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(persistUploadedFile({
      upload: vi.fn().mockResolvedValue({ bucket: "documents", path: "scope/file.pdf" }),
      persist: vi.fn().mockRejectedValue(persistenceError),
      remove: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    })).rejects.toBe(persistenceError);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

