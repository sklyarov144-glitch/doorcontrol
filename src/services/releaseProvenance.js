export function findVerifiedStagingRun(payload, releaseSha) {
  if (!/^[0-9a-f]{40}$/i.test(releaseSha)) throw new Error("release_sha must be a full 40-character commit SHA");
  const run = payload?.workflow_runs?.find((item) =>
    item.head_sha === releaseSha
      && item.head_branch === "main"
      && item.status === "completed"
      && item.conclusion === "success");
  if (!run) throw new Error(`No successful staging deployment found for ${releaseSha}`);
  return { id: run.id, url: run.html_url, sha: run.head_sha };
}
