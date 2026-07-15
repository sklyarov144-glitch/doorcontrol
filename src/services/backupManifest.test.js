import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function run(script, args) {
  return spawnSync(globalThis.process.execPath, [script, ...args], {
    cwd: globalThis.process.cwd(),
    encoding: "utf8",
  });
}

describe("backup manifest", () => {
  it("verifies every exported private Storage object", () => {
    const root = mkdtempSync(join(tmpdir(), "gross-storage-backup-"));
    const storage = join(root, "storage");
    const objectPath = join(storage, "documents", "company-1", "object-1", "act.pdf");
    mkdirSync(join(storage, "documents", "company-1", "object-1"), { recursive: true });
    writeFileSync(objectPath, "custody-act");
    const content = readFileSync(objectPath);
    const manifest = join(root, "storage-manifest.json");
    writeFileSync(manifest, JSON.stringify({
      version: 1,
      buckets: ["documents", "floor-plans", "avatars"],
      entries: [{
        bucket: "documents",
        path: "company-1/object-1/act.pdf",
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      }],
    }));

    expect(run("scripts/backup/verify-storage-export.mjs", [manifest, storage]).status).toBe(0);
    writeFileSync(objectPath, "tampered");
    expect(run("scripts/backup/verify-storage-export.mjs", [manifest, storage]).status).not.toBe(0);
  });

  it("verifies all components and detects tampering", () => {
    const root = mkdtempSync(join(tmpdir(), "gross-backup-"));
    const files = ["roles.sql", "schema.sql", "data.sql"];
    files.forEach((name) => writeFileSync(join(root, name), `${name}\nCOPY public.test FROM stdin;\n`));
    const manifest = join(root, "manifest.json");

    const created = run("scripts/backup/create-manifest.mjs", [manifest, ...files.map((name) => join(root, name))]);
    expect(created.status).toBe(0);
    expect(JSON.parse(readFileSync(manifest, "utf8")).entries).toHaveLength(3);
    expect(run("scripts/backup/verify-manifest.mjs", [manifest, root]).status).toBe(0);

    writeFileSync(join(root, "data.sql"), "tampered");
    expect(run("scripts/backup/verify-manifest.mjs", [manifest, root]).status).not.toBe(0);
  });

  it("creates restore evidence only for a usable domain restore", () => {
    const root = mkdtempSync(join(tmpdir(), "gross-restore-"));
    const counts = join(root, "counts.json");
    const archive = join(root, "source.enc");
    const evidence = join(root, "evidence.json");
    writeFileSync(archive, "encrypted-backup");
    writeFileSync(
      counts,
      JSON.stringify({ companies: 1, profiles: 4, objects: 2, buildings: 3, floors: 25, doors: 100, tasks: 0, documents: 0, storageObjects: 0 }),
    );

    const result = run("scripts/backup/create-restore-evidence.mjs", [
      evidence,
      counts,
      archive,
      "12345",
      "2026-07-14T10:00:00Z",
      "2026-07-14T10:03:00Z",
    ]);
    expect(result.status).toBe(0);
    const report = JSON.parse(readFileSync(evidence, "utf8"));
    expect(report).toMatchObject({ result: "passed", backupRunId: 12345, durationSeconds: 180 });
    expect(report.archiveSha256).toMatch(/^[a-f0-9]{64}$/);

    writeFileSync(counts, JSON.stringify({ companies: 0, profiles: 0, objects: 0, buildings: 0, floors: 0, doors: 0, tasks: 0, documents: 0, storageObjects: 0 }));
    expect(
      run("scripts/backup/create-restore-evidence.mjs", [
        evidence,
        counts,
        archive,
        "12345",
        "2026-07-14T10:00:00Z",
        "2026-07-14T10:03:00Z",
      ]).status,
    ).not.toBe(0);
  });
});
