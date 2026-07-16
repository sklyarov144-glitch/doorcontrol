const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const reviewerTypes = new Set(["User", "Team"]);
const protectedEnvironments = new Set(["production", "production-restore"]);

export function parseProductionReviewers(value) {
  const entries = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!entries.length) throw new Error("PRODUCTION_REVIEWERS must contain at least one User:<id> or Team:<id>");
  if (entries.length > 6) throw new Error("GitHub supports at most six production reviewers");

  const reviewers = entries.map((entry) => {
    const match = /^(User|Team):(\d+)$/.exec(entry);
    if (!match || !reviewerTypes.has(match[1])) {
      throw new Error(`Invalid production reviewer '${entry}'; expected User:<id> or Team:<id>`);
    }
    const id = Number(match[2]);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid reviewer id in '${entry}'`);
    return { type: match[1], id };
  });

  const unique = new Map(reviewers.map((reviewer) => [`${reviewer.type}:${reviewer.id}`, reviewer]));
  if (unique.size !== reviewers.length) throw new Error("PRODUCTION_REVIEWERS contains duplicate reviewers");
  return [...unique.values()];
}

export function validateProductionProtectionInput(values, { apply = false } = {}) {
  const repository = values.GITHUB_REPOSITORY?.trim() || "sklyarov144-glitch/doorcontrol";
  if (!repositoryPattern.test(repository)) throw new Error("GITHUB_REPOSITORY is invalid");
  const environment = values.PROTECTED_ENVIRONMENT?.trim() || "production";
  if (!protectedEnvironments.has(environment)) {
    throw new Error("PROTECTED_ENVIRONMENT must be production or production-restore");
  }
  const reviewers = parseProductionReviewers(values.PRODUCTION_REVIEWERS);
  const reviewerList = reviewers.map(({ type, id }) => `${type}:${id}`).join(",");
  const expectedConfirmation = `${environment.toUpperCase()}:${repository}:${reviewerList}`;

  if (apply && values.PRODUCTION_PROTECTION_CONFIRM !== expectedConfirmation) {
    throw new Error(`Set PRODUCTION_PROTECTION_CONFIRM exactly to ${expectedConfirmation}`);
  }

  return { repository, environment, reviewers, reviewerList, expectedConfirmation };
}

export function buildProductionEnvironmentPayload(currentSettings, reviewers) {
  const waitRule = (currentSettings.protection_rules ?? []).find((rule) => rule.type === "wait_timer");
  return {
    wait_timer: waitRule?.wait_timer ?? 0,
    prevent_self_review: true,
    reviewers,
    deployment_branch_policy: currentSettings.deployment_branch_policy ?? null,
  };
}

function normalizedConfiguredReviewers(settings) {
  const rule = (settings.protection_rules ?? []).find((item) => item.type === "required_reviewers");
  return {
    preventSelfReview: rule?.prevent_self_review === true,
    reviewers: (rule?.reviewers ?? []).map((item) => ({
      type: item.type,
      id: Number(item.reviewer?.id ?? item.id),
    })),
  };
}

export function verifyProductionProtection(settings, requiredReviewers) {
  const configured = normalizedConfiguredReviewers(settings);
  const configuredKeys = new Set(configured.reviewers.map(({ type, id }) => `${type}:${id}`));
  const missingReviewers = requiredReviewers.filter(({ type, id }) => !configuredKeys.has(`${type}:${id}`));
  const missing = [];
  if (missingReviewers.length) missing.push("required reviewers");
  if (!configured.preventSelfReview) missing.push("self-review disabled");
  if (settings.can_admins_bypass !== false) missing.push("admin bypass disabled");
  return {
    ready: missing.length === 0,
    apiConfigurationReady: missingReviewers.length === 0 && configured.preventSelfReview,
    missing,
    missingReviewers,
  };
}
