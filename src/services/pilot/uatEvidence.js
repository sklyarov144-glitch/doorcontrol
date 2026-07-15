export const requiredUatScenarios = [
  "auth-login-recovery",
  "disabled-user-denied",
  "deep-link-refresh",
  "responsive-navigation",
  "safe-error-messages",
  "creator-scope",
  "company-head-isolation",
  "director-assignment-scope",
  "itr-assignment-scope",
  "cross-company-isolation",
  "database-enforced-access",
  "itr-door-route",
  "door-status-persistence",
  "workflow-dates",
  "door-priority-color",
  "task-comment-document-access",
  "executive-dashboard",
  "problem-task-context",
  "responsibility-assignments",
  "finance-hidden-from-itr",
  "report-source-reconciliation",
  "private-file-access",
  "signed-url-expiry",
  "audit-attribution",
  "audit-user-retention",
  "public-smoke-performance",
  "authenticated-domain-performance",
  "pilot-floor-responsiveness",
  "pilot-concurrency",
];

export function validateUatEvidence(evidence) {
  const errors = [];
  if (evidence?.environment !== "staging") errors.push("environment must be staging");
  if (!/^[0-9a-f]{40}$/i.test(evidence?.releaseSha ?? "")) errors.push("releaseSha must be a full commit SHA");
  try {
    const url = new URL(evidence?.appUrl);
    if (url.protocol !== "https:") errors.push("appUrl must use HTTPS");
  } catch {
    errors.push("appUrl must be a valid URL");
  }

  const scenarios = new Map((evidence?.scenarios ?? []).map((item) => [item.id, item]));
  for (const id of requiredUatScenarios) {
    const scenario = scenarios.get(id);
    if (!scenario) {
      errors.push(`scenario ${id} is missing`);
      continue;
    }
    if (scenario.status !== "pass") errors.push(`scenario ${id} must pass`);
    if (!scenario.executedBy?.trim() || !Date.parse(scenario.executedAt)) {
      errors.push(`scenario ${id} requires executor and date`);
    }
  }
  for (const id of scenarios.keys()) {
    if (!requiredUatScenarios.includes(id)) errors.push(`unknown scenario ${id}`);
  }

  for (const defect of evidence?.defects ?? []) {
    if (defect.severity === "critical" && defect.status !== "closed") {
      errors.push(`critical defect ${defect.id ?? "without id"} is not closed`);
    }
  }
  for (const role of ["productOwner", "itrRepresentative"]) {
    const signoff = evidence?.signoffs?.[role];
    if (!signoff?.approved || !signoff.name?.trim() || !Date.parse(signoff.approvedAt)) {
      errors.push(`${role} sign-off is incomplete`);
    }
  }
  return { valid: errors.length === 0, errors, passed: requiredUatScenarios.length };
}
