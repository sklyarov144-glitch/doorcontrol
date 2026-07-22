import { describe, expect, it } from "vitest";
import { safeErrorMessage } from "./safeErrorMessage";

describe("safeErrorMessage", () => {
  it("does not expose the original error details", () => {
    const result = safeErrorMessage(new Error("https://example.supabase.co?access_token=secret"));

    expect(result).not.toContain("supabase");
    expect(result).not.toContain("secret");
    expect(result).toContain("техническому специалисту");
  });
});
