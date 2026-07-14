import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
});
