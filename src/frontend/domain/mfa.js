export const privilegedMfaRoles = new Set([
  "creator",
  "company_head",
  "construction_director",
]);

export function isPrivilegedMfaRole(role) {
  return privilegedMfaRoles.has(role);
}

export function isMfaEnforcementEnabled(value = import.meta.env.VITE_REQUIRE_PRIVILEGED_MFA) {
  return String(value ?? "").toLowerCase() === "true";
}

export function requiresMfa(role, options = {}) {
  const enabled = options.enabled ?? isMfaEnforcementEnabled();
  return Boolean(enabled && isPrivilegedMfaRole(role));
}

export function resolveMfaStep(status = {}) {
  if (status.currentLevel === "aal2") return "verified";
  if (status.verifiedFactorId) return "challenge";
  return "enroll";
}
