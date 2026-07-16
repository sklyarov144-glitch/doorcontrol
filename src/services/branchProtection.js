const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const requiredMainChecks = Object.freeze(["verify", "database", "e2e"]);

function parseApprovalCount(value) {
  const raw = String(value ?? "0").trim();
  if (!/^\d+$/.test(raw)) throw new Error("BRANCH_REQUIRED_APPROVALS must be an integer from 0 to 6");
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 0 || count > 6) {
    throw new Error("BRANCH_REQUIRED_APPROVALS must be an integer from 0 to 6");
  }
  return count;
}

export function validateMainProtectionInput(values, { apply = false } = {}) {
  const repository = values.GITHUB_REPOSITORY?.trim() || "sklyarov144-glitch/doorcontrol";
  if (!repositoryPattern.test(repository)) throw new Error("GITHUB_REPOSITORY is invalid");

  const branch = values.PROTECTED_BRANCH?.trim() || "main";
  if (branch !== "main") throw new Error("PROTECTED_BRANCH must be main");

  const approvalCount = parseApprovalCount(values.BRANCH_REQUIRED_APPROVALS);
  const checks = [...requiredMainChecks];
  const expectedConfirmation = `MAIN:${repository}:${checks.join(",")}:${approvalCount}`;

  if (apply && values.BRANCH_PROTECTION_CONFIRM !== expectedConfirmation) {
    throw new Error(`Set BRANCH_PROTECTION_CONFIRM exactly to ${expectedConfirmation}`);
  }

  return { repository, branch, approvalCount, checks, expectedConfirmation };
}

export function buildMainProtectionPayload({ approvalCount = 0, checks = requiredMainChecks } = {}) {
  return {
    required_status_checks: {
      strict: true,
      contexts: [...checks],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: approvalCount,
      require_last_push_approval: approvalCount > 0,
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: true,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: false,
  };
}

function configuredContexts(protection) {
  const statusChecks = protection?.required_status_checks ?? {};
  return new Set([
    ...(statusChecks.contexts ?? []),
    ...(statusChecks.checks ?? []).map((check) => check.context),
  ]);
}

export function auditMainProtection(protection, {
  approvalCount = 0,
  checks = requiredMainChecks,
} = {}) {
  const missing = [];
  if (!protection) {
    return { ready: false, missing: ["main branch protection"] };
  }

  const configured = configuredContexts(protection);
  const absentChecks = checks.filter((check) => !configured.has(check));
  if (absentChecks.length) missing.push(`required checks: ${absentChecks.join(", ")}`);
  if (protection.required_status_checks?.strict !== true) missing.push("branch must be up to date before merge");
  if (protection.enforce_admins?.enabled !== true) missing.push("protection applies to administrators");

  const reviews = protection.required_pull_request_reviews;
  if (!reviews) {
    missing.push("changes require a pull request");
  } else {
    if (reviews.required_approving_review_count !== approvalCount) {
      missing.push(`required approvals = ${approvalCount}`);
    }
    if (reviews.dismiss_stale_reviews !== true) missing.push("stale approvals dismissed");
    if (approvalCount > 0 && reviews.require_last_push_approval !== true) {
      missing.push("last push approved by another user");
    }
  }

  if (protection.required_linear_history?.enabled !== true) missing.push("linear history");
  if (protection.required_conversation_resolution?.enabled !== true) missing.push("conversation resolution");
  if (protection.allow_force_pushes?.enabled !== false) missing.push("force pushes disabled");
  if (protection.allow_deletions?.enabled !== false) missing.push("branch deletion disabled");

  return { ready: missing.length === 0, missing };
}

export function validateObservedChecks(requiredChecks, observedChecks) {
  const observed = new Set(observedChecks ?? []);
  const missing = requiredChecks.filter((check) => !observed.has(check));
  if (missing.length) {
    throw new Error(`Required checks have not been observed on main: ${missing.join(", ")}`);
  }
  return true;
}

export function validateApprovalCapacity(approvalCount, collaborators, actor) {
  if (approvalCount === 0) return true;
  const eligible = (collaborators ?? []).filter((collaborator) => (
    collaborator.login !== actor
    && (collaborator.permissions?.push === true || collaborator.permissions?.admin === true)
  ));
  if (eligible.length < approvalCount) {
    throw new Error(
      `Only ${eligible.length} independent collaborator(s) can approve, but ${approvalCount} approval(s) were requested`,
    );
  }
  return true;
}
