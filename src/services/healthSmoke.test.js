import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";

let server;
afterEach(() => new Promise((resolve) => server?.close(resolve) ?? resolve()));

function runHealthSmoke(env) {
  return new Promise((resolve) => {
    const child = spawn(globalThis.process.execPath, ["scripts/health-smoke.mjs"], {
      cwd: globalThis.process.cwd(),
      env: { ...globalThis.process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

describe("backend health smoke", () => {
  it("requires explicit Supabase credentials", () => {
    const result = spawnSync(globalThis.process.execPath, ["scripts/health-smoke.mjs"], {
      cwd: globalThis.process.cwd(),
      env: { ...globalThis.process.env, SUPABASE_URL: "", SUPABASE_ANON_KEY: "" },
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SUPABASE_URL and SUPABASE_ANON_KEY are required");
  });

  it("authenticates the health request and validates its payload", async () => {
    server = http.createServer((request, response) => {
      expect(request.url).toBe("/functions/v1/health");
      expect(request.headers.apikey).toBe("test-anon-key");
      expect(request.headers.authorization).toBe("Bearer test-anon-key");
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ status: "ok", database: "ok", latencyMs: 12 }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    const result = await runHealthSmoke({
      SUPABASE_URL: `http://127.0.0.1:${port}`,
      SUPABASE_ANON_KEY: "test-anon-key",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Backend health smoke passed in 12 ms");
  });
});
