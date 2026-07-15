import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function verify(content) {
  const root = mkdtempSync(join(tmpdir(), "gross-bundle-"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "index.html"), "<div id=\"root\"></div>");
  writeFileSync(join(root, "assets", "app.js"), content);
  return spawnSync(globalThis.process.execPath, ["scripts/verify-production-bundle.mjs", root], {
    cwd: globalThis.process.cwd(),
    env: { ...globalThis.process.env, VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" },
    encoding: "utf8",
  });
}

describe("production bundle verification", () => {
  it("requires the configured Supabase runtime", () => {
    expect(verify("https://abcdefghijklmnopqrst.supabase.co").status).toBe(0);
    expect(verify("https://another-project.supabase.co").status).not.toBe(0);
  });

  it("rejects legacy personal data markers", () => {
    expect(verify("https://abcdefghijklmnopqrst.supabase.co; i.sklyarov@gk-gross.ru").status).not.toBe(0);
  });
});
