import { describe, expect, it } from "vitest";
import { generateTotp } from "./totp.mjs";

describe("RFC 6238 TOTP", () => {
  it("matches the published SHA-1 test vector", () => {
    expect(generateTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", {
      timestamp: 59_000,
      digits: 8,
    })).toBe("94287082");
  });
});
