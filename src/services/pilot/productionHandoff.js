const countKeys = ["objects", "buildings", "floors", "doors"];
const ownerKeys = ["businessOwner", "technicalOwner", "dataOwner", "supportOwner", "releaseReviewer"];
const approvalKeys = ["businessOwner", "technicalOwner", "dataOwner"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const githubLoginPattern = /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function normalizedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("must use HTTPS");
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

function validatePerson(person, path, errors, { github = false, phone = false } = {}) {
  if (!person?.name?.trim()) errors.push(`${path}.name is required`);
  if (!emailPattern.test(person?.email ?? "")) errors.push(`${path}.email is invalid`);
  if (github && !githubLoginPattern.test(person?.githubLogin ?? "")) {
    errors.push(`${path}.githubLogin is invalid`);
  }
  if (phone && String(person?.phone ?? "").replace(/\D/g, "").length < 7) {
    errors.push(`${path}.phone is invalid`);
  }
}

function timestamp(value, path, errors) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) errors.push(`${path} must be a timestamp`);
  return parsed;
}

export function validateProductionHandoff(handoff, expectedReleaseSha, reconciliation, options = {}) {
  const errors = [];
  const now = options.now ?? new Date();
  const nowMs = now.valueOf();

  if (handoff?.version !== 1) errors.push("version must be 1");
  if (handoff?.environment !== "production") errors.push("environment must be production");
  if (!/^[0-9a-f]{40}$/i.test(handoff?.releaseSha ?? "")) {
    errors.push("releaseSha must be a full commit SHA");
  } else if (expectedReleaseSha && handoff.releaseSha.toLowerCase() !== expectedReleaseSha.toLowerCase()) {
    errors.push("releaseSha does not match the requested production release");
  }

  let productionUrl;
  try {
    productionUrl = normalizedUrl(handoff?.productionUrl);
  } catch {
    errors.push("productionUrl must be a valid HTTPS URL");
  }
  if (options.expectedProductionUrl && productionUrl) {
    try {
      if (productionUrl !== normalizedUrl(options.expectedProductionUrl)) {
        errors.push("productionUrl does not match APP_PUBLIC_URL");
      }
    } catch {
      errors.push("expected production URL is invalid");
    }
  }

  if (!repositoryPattern.test(handoff?.repository ?? "")) errors.push("repository is invalid");
  if (options.repository && handoff?.repository !== options.repository) {
    errors.push("repository does not match GITHUB_REPOSITORY");
  }
  if (!handoff?.companyName?.trim()) errors.push("companyName is required");

  for (const key of ownerKeys) {
    validatePerson(handoff?.owners?.[key], `owners.${key}`, errors, {
      github: ["technicalOwner", "releaseReviewer"].includes(key),
      phone: key === "supportOwner",
    });
  }
  const technicalLogin = handoff?.owners?.technicalOwner?.githubLogin?.toLowerCase();
  const reviewerLogin = handoff?.owners?.releaseReviewer?.githubLogin?.toLowerCase();
  if (technicalLogin && reviewerLogin && technicalLogin === reviewerLogin) {
    errors.push("releaseReviewer must be independent from technicalOwner");
  }

  if (!/^[0-9a-f]{64}$/i.test(handoff?.pilot?.sourceSha256 ?? "")) {
    errors.push("pilot.sourceSha256 is invalid");
  } else if (reconciliation?.sourceSha256
    && handoff.pilot.sourceSha256.toLowerCase() !== reconciliation.sourceSha256.toLowerCase()) {
    errors.push("pilot.sourceSha256 does not match reconciliation evidence");
  }
  for (const key of countKeys) {
    const count = handoff?.pilot?.expectedCounts?.[key];
    if (!Number.isInteger(count) || count < 1) {
      errors.push(`pilot.expectedCounts.${key} must be a positive integer`);
    } else if (reconciliation?.expectedCounts?.[key] !== count) {
      errors.push(`pilot.expectedCounts.${key} does not match reconciliation evidence`);
    }
  }
  const frozenAt = timestamp(handoff?.pilot?.dataFrozenAt, "pilot.dataFrozenAt", errors);
  if (Number.isFinite(frozenAt) && frozenAt > nowMs + 5 * 60 * 1000) {
    errors.push("pilot.dataFrozenAt cannot be in the future");
  }
  const suppliedApprovalNotBefore = options.approvalNotBefore instanceof Date
    ? options.approvalNotBefore.valueOf()
    : Date.parse(options.approvalNotBefore);
  const approvalNotBefore = Math.max(
    Number.isFinite(frozenAt) ? frozenAt : Number.NEGATIVE_INFINITY,
    Number.isFinite(suppliedApprovalNotBefore) ? suppliedApprovalNotBefore : Number.NEGATIVE_INFINITY,
  );

  const startsAt = timestamp(handoff?.releaseWindow?.startsAt, "releaseWindow.startsAt", errors);
  const endsAt = timestamp(handoff?.releaseWindow?.endsAt, "releaseWindow.endsAt", errors);
  if (Number.isFinite(startsAt) && Number.isFinite(endsAt)) {
    if (endsAt <= startsAt) errors.push("releaseWindow must end after it starts");
    if (endsAt - startsAt > 8 * 60 * 60 * 1000) errors.push("releaseWindow must not exceed 8 hours");
    if (options.requireActiveWindow !== false && (nowMs < startsAt || nowMs > endsAt)) {
      errors.push("production release is outside the approved releaseWindow");
    }
  }

  for (const key of approvalKeys) {
    const approval = handoff?.approvals?.[key];
    if (approval?.approved !== true) errors.push(`approvals.${key} must be approved`);
    if (!emailPattern.test(approval?.approvedByEmail ?? "")) {
      errors.push(`approvals.${key}.approvedByEmail is invalid`);
    } else if (approval.approvedByEmail.toLowerCase() !== handoff?.owners?.[key]?.email?.toLowerCase()) {
      errors.push(`approvals.${key} must be signed by its named owner`);
    }
    const approvedAt = timestamp(approval?.approvedAt, `approvals.${key}.approvedAt`, errors);
    if (Number.isFinite(approvedAt)) {
      if (approvedAt > nowMs + 5 * 60 * 1000) errors.push(`approvals.${key}.approvedAt cannot be in the future`);
      if (Number.isFinite(approvalNotBefore) && approvedAt < approvalNotBefore) {
        errors.push(`approvals.${key} must be signed after all release evidence is complete`);
      }
    }
  }

  if (handoff?.operations?.runbookAcknowledged !== true) {
    errors.push("operations.runbookAcknowledged must be true");
  }
  if (handoff?.operations?.rollbackPlanAcknowledged !== true) {
    errors.push("operations.rollbackPlanAcknowledged must be true");
  }
  if (handoff?.operations?.backupOwnerEmail?.toLowerCase()
    !== handoff?.owners?.technicalOwner?.email?.toLowerCase()) {
    errors.push("operations.backupOwnerEmail must match technicalOwner");
  }
  if (handoff?.operations?.supportEmail?.toLowerCase()
    !== handoff?.owners?.supportOwner?.email?.toLowerCase()) {
    errors.push("operations.supportEmail must match supportOwner");
  }

  return { valid: errors.length === 0, errors };
}
