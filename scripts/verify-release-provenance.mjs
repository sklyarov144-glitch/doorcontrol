import { findVerifiedStagingRun } from "../src/services/releaseProvenance.js";

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
const verified = findVerifiedStagingRun(await response.json(), releaseSha);
console.log(`Verified staging release: ${verified.sha} (${verified.url}).`);
