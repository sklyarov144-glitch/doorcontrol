import { describe, expect, it } from "vitest";
import { localProvider } from "./localProvider";
import { supabaseProvider } from "./supabaseProvider";
import { selectDataProvider } from "./index";

describe("data provider selection", () => {
  it("keeps the local provider as the safe default", () => {
    expect(selectDataProvider("local", false)).toBe(localProvider);
  });

  it("selects Supabase only when its public configuration exists", () => {
    expect(selectDataProvider("supabase", true)).toBe(supabaseProvider);
    expect(() => selectDataProvider("supabase", false)).toThrow(/requires/);
  });

  it("fails closed for an unknown provider instead of silently using demo storage", () => {
    expect(() => selectDataProvider("supabse", true)).toThrow(/Unsupported data provider/);
  });
});
