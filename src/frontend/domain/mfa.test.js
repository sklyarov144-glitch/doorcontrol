import { describe, expect, it } from "vitest";
import { isMfaEnforcementEnabled, isPrivilegedMfaRole, requiresMfa, resolveMfaStep } from "./mfa";

describe("privileged MFA policy", () => {
  it("protects management roles but does not force MFA on ITR", () => {
    expect(isPrivilegedMfaRole("creator")).toBe(true);
    expect(isPrivilegedMfaRole("company_head")).toBe(true);
    expect(isPrivilegedMfaRole("construction_director")).toBe(true);
    expect(isPrivilegedMfaRole("itr")).toBe(false);
    expect(requiresMfa("creator", { enabled: true })).toBe(true);
    expect(requiresMfa("itr", { enabled: true })).toBe(false);
  });

  it("only enables enforcement for the explicit true value", () => {
    expect(isMfaEnforcementEnabled("true")).toBe(true);
    expect(isMfaEnforcementEnabled("TRUE")).toBe(true);
    expect(isMfaEnforcementEnabled("false")).toBe(false);
    expect(isMfaEnforcementEnabled()).toBe(false);
  });

  it("derives enrollment, challenge and verified steps", () => {
    expect(resolveMfaStep({ currentLevel: "aal1" })).toBe("enroll");
    expect(resolveMfaStep({ currentLevel: "aal1", verifiedFactorId: "factor-1" })).toBe("challenge");
    expect(resolveMfaStep({ currentLevel: "aal2", verifiedFactorId: "factor-1" })).toBe("verified");
    expect(resolveMfaStep({ currentLevel: "aal2", verifiedFactorId: null })).toBe("enroll");
  });
});
