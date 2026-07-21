import { findVerifiedStagingRun } from "../src/services/releaseProvenance.js";
import { validateStagingReleaseEvidence } from "../src/services/stagingReleaseEvidence.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const token = required("GITHUB_TOKEN");
const repository = required("GITHUB_REPOSITORY");
const releaseSha = required("RELEASE_SHA").toLowerCase();
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY has an unexpected format");

const endpoint = new URL(`https://api.github.com/repos/${repository}/actions/workflows/deploy-staging.yml/runs`);
endpoint.searchParams.set("head_sha", releaseSha);
endpoint.searchParams.set("status", "completed");
endpoint.searchParams.set("per_page", "100");
const response = await fetch(endpoint, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  },
});
if (!response.ok) throw new Error(`GitHub workflow lookup failed with HTTP ${response.status}`);
const runsPayload = await response.json();

async function githubJson(pathname) {
  const response = await fetch(`https://api.github.com/repos/${repository}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API lookup failed with HTTP ${response.status}`);
  return response.json();
}

async function verifyManualRun(run) {
  const artifacts = await githubJson(`/actions/runs/${run.id}/artifacts?per_page=100`);
  const artifact = artifacts.artifacts?.find((item) => item.name === `staging-release-${releaseSha}` && !item.expired);
  if (!artifact) return false;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gross-staging-provenance-"));
  const archivePath = path.join(tempDir, "evidence.zip");
  try {
    const archiveResponse = await fetch(artifact.archive_download_url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!archiveResponse.ok) return false;
    fs.writeFileSync(archivePath, Buffer.from(await archiveResponse.arrayBuffer()), { mode: 0o600 });
    const extracted = spawnSync("unzip", ["-p", archivePath, "staging-release-evidence.json"], { encoding: "utf8" });
    if (extracted.status !== 0 || !extracted.stdout.trim()) return false;

    const evidence = JSON.parse(extracted.stdout);
    const evidenceResult = validateStagingReleaseEvidence(evidence, {
      releaseSha,
      githubRunId: String(run.id),
      githubRunUrl: run.html_url,
    });
    if (!evidenceResult.valid) return false;

    const sourceCi = await githubJson(`/actions/runs/${evidence.sourceCiRunId}`);
    return sourceCi.name === "CI"
      && sourceCi.head_branch === "main"
      && sourceCi.head_sha === releaseSha
      && sourceCi.status === "completed"
      && sourceCi.conclusion === "success";
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const verifiedManualRunIds = [];
for (const run of runsPayload.workflow_runs ?? []) {
  if (run.head_sha !== releaseSha || run.event !== "workflow_dispatch" || run.status !== "completed" || run.conclusion !== "success") continue;
  if (await verifyManualRun(run)) verifiedManualRunIds.push(run.id);
}

const verified = findVerifiedStagingRun(runsPayload, releaseSha, { verifiedManualRunIds });
if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `STAGING_RUN_ID=${verified.id}\nSTAGING_RUN_URL=${verified.url}\n`);
}
console.log(`Verified staging release: ${verified.sha} (${verified.url}).`);
