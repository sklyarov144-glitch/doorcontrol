import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const supabaseUrl = "https://abcdefghijklmnopqrst.supabase.co";
const output = mkdtempSync(join(tmpdir(), "gross-production-build-"));
const env = {
  ...process.env,
  DEPLOY_ENV: "staging",
  VITE_DATA_PROVIDER: "supabase",
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: "a".repeat(100),
  VITE_APP_URL: "https://staging.example.ru",
};

try {
  execFileSync(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "build", "--outDir", output, "--emptyOutDir"], {
    env,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [resolve("scripts/verify-production-bundle.mjs"), output], {
    env,
    stdio: "inherit",
  });
} finally {
  rmSync(output, { recursive: true, force: true });
}
