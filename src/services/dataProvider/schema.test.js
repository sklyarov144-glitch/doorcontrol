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
const authHardening = readFileSync(
  resolve("supabase/migrations/202607130003_auth_hardening.sql"),
  "utf8"
);
const operational = readFileSync(
  resolve("supabase/migrations/202607130005_operational_modules.sql"),
  "utf8"
);
const operationalRls = readFileSync(
  resolve("supabase/migrations/202607130006_operational_rls.sql"),
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

  it("prevents users from escalating their own role", () => {
    expect(authHardening).toContain("protect_profile_security_fields");
    expect(authHardening).toContain("new.role is distinct from old.role");
    expect(authHardening).toContain("new.company_id is distinct from old.company_id");
  });

  it("defines normalized operational modules and idempotent overdue tasks", () => {
    for (const table of ["tasks", "task_comments", "task_links", "notifications", "document_items", "custody_acts", "tn_issues", "activity_logs"]) {
      expect(operational).toContain(`create table public.${table}`);
    }
    expect(operational).toContain("automatic_key text unique");
    expect(operational).toContain("sync_overdue_door_tasks");
    expect(operational).toContain("on conflict (automatic_key) do nothing");
    expect(operational).toContain("notify_task_change");
  });

  it("protects every operational table with RLS", () => {
    for (const table of ["tasks", "task_comments", "task_links", "notifications", "document_items", "custody_acts", "tn_issues", "activity_logs"]) {
      expect(operationalRls).toContain(`alter table public.${table} enable row level security`);
    }
  });
});
