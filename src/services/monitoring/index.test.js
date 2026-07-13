import { describe, expect, it } from "vitest";
import { captureApplicationError, initMonitoring, setMonitoringUser } from "./index";

describe("monitoring", () => {
  it("is a safe no-op when no DSN is configured", () => {
    expect(initMonitoring()).toBe(false);
    expect(() => captureApplicationError(new Error("test"))).not.toThrow();
    expect(() => setMonitoringUser({ id: "user", role: "itr", email: "private@example.com" })).not.toThrow();
  });
});

