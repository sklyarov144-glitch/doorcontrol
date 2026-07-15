import { describe, expect, it } from "vitest";
import {
  authConfigurationEndpoint,
  buildHostedAuthConfiguration,
  normalizeAppPublicUrl,
  verifyHostedAuthConfiguration,
} from "./authConfiguration";

describe("hosted Supabase Auth configuration", () => {
  it("keeps public signup disabled while email sign-in remains enabled", () => {
    const config = buildHostedAuthConfiguration("https://staging.gross.example/");
    expect(config).toMatchObject({
      site_url: "https://staging.gross.example",
      disable_signup: true,
      external_email_enabled: true,
      external_phone_enabled: false,
    });
    expect(config.uri_allow_list).toContain("https://staging.gross.example/reset-password");
  });

  it("rejects unsafe or path-based public URLs", () => {
    expect(() => normalizeAppPublicUrl("http://staging.gross.example")).toThrow("HTTPS");
    expect(() => normalizeAppPublicUrl("https://staging.gross.example/app")).toThrow("origin");
  });

  it("builds a scoped management endpoint", () => {
    expect(authConfigurationEndpoint("abcdefghijklmnopqrst"))
      .toBe("https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth");
    expect(() => authConfigurationEndpoint("wrong")).toThrow("project ref");
  });

  it("reports exact remote drift without exposing unrelated configuration", () => {
    const expected = buildHostedAuthConfiguration("https://staging.gross.example");
    const result = verifyHostedAuthConfiguration({ ...expected, disable_signup: false }, expected);
    expect(result.valid).toBe(false);
    expect(result.mismatches).toEqual([{ key: "disable_signup", expected: true, actual: false }]);
  });
});
