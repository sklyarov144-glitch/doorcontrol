import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const core = readFileSync(
  resolve("supabase/migrations/202607130001_core_schema.sql"),
  "utf8"
);
const rls = readFileSync(
  resolve("supabase/migrations/202607130002_rls.sql"),
  "utf8"
);

describe("Supabase schema", () => {
  it("defines the core hierarchy and assignment tables", () => {
    for (const table of [
      "companies",
      "profiles",
      "objects",
      "buildings",
      "floors",
      "doors",
      "object_assignments",
      "building_assignments",
    ]) {
      expect(core).toContain(`create table public.${table}`);
    }
  });

  it("enables RLS and restricts object creation to leadership roles", () => {
    expect(rls).toContain("alter table public.doors enable row level security");
    expect(rls).toContain("create policy objects_insert");
    expect(rls).toContain("('creator', 'company_head')");
    expect(rls).toContain("public.can_access_building");
  });
});
