import { describe, expect, it } from "vitest";
import { validateProductionHandoff } from "./productionHandoff";

const releaseSha = "a".repeat(40);
const sourceSha256 = "b".repeat(64);
const now = new Date("2026-07-16T12:00:00Z");
const reconciliation = {
  sourceSha256,
  expectedCounts: { objects: 1, buildings: 3, floors: 33, doors: 198 },
};

function handoff() {
  return {
    version: 1,
    environment: "production",
    releaseSha,
    productionUrl: "https://gross.example.ru",
    repository: "gross/app",
    companyName: "ООО ГРОСС",
    owners: {
      businessOwner: { name: "Бизнес", email: "business@gross.example" },
      technicalOwner: { name: "Техника", email: "tech@gross.example", githubLogin: "gross-tech" },
      dataOwner: { name: "Данные", email: "data@gross.example" },
      supportOwner: { name: "Поддержка", email: "support@gross.example", phone: "+7 999 000-00-00" },
      releaseReviewer: { name: "Ревьюер", email: "review@gross.example", githubLogin: "gross-review" },
    },
    pilot: {
      sourceSha256,
      expectedCounts: { ...reconciliation.expectedCounts },
      dataFrozenAt: "2026-07-16T09:00:00Z",
    },
    releaseWindow: {
      startsAt: "2026-07-16T10:00:00Z",
      endsAt: "2026-07-16T14:00:00Z",
    },
    approvals: {
      businessOwner: { approved: true, approvedByEmail: "business@gross.example", approvedAt: "2026-07-16T09:10:00Z" },
      technicalOwner: { approved: true, approvedByEmail: "tech@gross.example", approvedAt: "2026-07-16T09:15:00Z" },
      dataOwner: { approved: true, approvedByEmail: "data@gross.example", approvedAt: "2026-07-16T09:20:00Z" },
    },
    operations: {
      runbookAcknowledged: true,
      rollbackPlanAcknowledged: true,
      backupOwnerEmail: "tech@gross.example",
      supportEmail: "support@gross.example",
    },
  };
}

describe("production handoff", () => {
  it("accepts a release-bound operational handoff", () => {
    expect(validateProductionHandoff(handoff(), releaseSha, reconciliation, {
      now,
      expectedProductionUrl: "https://gross.example.ru/",
      repository: "gross/app",
    })).toEqual({ valid: true, errors: [] });
  });

  it("rejects release, domain and repository drift", () => {
    const input = handoff();
    input.releaseSha = "c".repeat(40);
    input.productionUrl = "https://other.example.ru";
    input.repository = "other/app";
    const result = validateProductionHandoff(input, releaseSha, reconciliation, {
      now,
      expectedProductionUrl: "https://gross.example.ru",
      repository: "gross/app",
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      "releaseSha does not match the requested production release",
      "productionUrl does not match APP_PUBLIC_URL",
      "repository does not match GITHUB_REPOSITORY",
    ]));
  });

  it("rejects pilot data that differs from reconciliation", () => {
    const input = handoff();
    input.pilot.sourceSha256 = "d".repeat(64);
    input.pilot.expectedCounts.doors = 197;
    const result = validateProductionHandoff(input, releaseSha, reconciliation, { now });
    expect(result.errors).toContain("pilot.sourceSha256 does not match reconciliation evidence");
    expect(result.errors).toContain("pilot.expectedCounts.doors does not match reconciliation evidence");
  });

  it("requires an independent release reviewer and owner-matched approvals", () => {
    const input = handoff();
    input.owners.releaseReviewer.githubLogin = "GROSS-TECH";
    input.approvals.dataOwner.approvedByEmail = "other@gross.example";
    const result = validateProductionHandoff(input, releaseSha, reconciliation, { now });
    expect(result.errors).toContain("releaseReviewer must be independent from technicalOwner");
    expect(result.errors).toContain("approvals.dataOwner must be signed by its named owner");
  });

  it("blocks deployment outside the approved release window", () => {
    const result = validateProductionHandoff(handoff(), releaseSha, reconciliation, {
      now: new Date("2026-07-16T15:00:00Z"),
    });
    expect(result.errors).toContain("production release is outside the approved releaseWindow");
  });

  it("requires operational acceptance and named support ownership", () => {
    const input = handoff();
    input.operations.runbookAcknowledged = false;
    input.operations.supportEmail = "unknown@gross.example";
    const result = validateProductionHandoff(input, releaseSha, reconciliation, { now });
    expect(result.errors).toContain("operations.runbookAcknowledged must be true");
    expect(result.errors).toContain("operations.supportEmail must match supportOwner");
  });

  it("rejects approvals made before release evidence is complete", () => {
    const result = validateProductionHandoff(handoff(), releaseSha, reconciliation, {
      now,
      approvalNotBefore: new Date("2026-07-16T11:00:00Z"),
    });
    expect(result.errors).toContain(
      "approvals.businessOwner must be signed after all release evidence is complete",
    );
  });
});
