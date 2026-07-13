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
const storageMigration = readFileSync(
  resolve("supabase/migrations/202607130007_storage_buckets.sql"),
  "utf8"
);
const auditMigration = readFileSync(
  resolve("supabase/migrations/202607130008_audit_security.sql"),
  "utf8"
);
const workforceFinance = readFileSync(
  resolve("supabase/migrations/202607130009_workforce_finance.sql"),
  "utf8"
);
const workforceFinanceRls = readFileSync(
  resolve("supabase/migrations/202607130010_workforce_finance_rls.sql"),
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

  it("creates private scoped storage buckets", () => {
    for (const bucket of ["documents", "floor-plans", "avatars"]) {
      expect(storageMigration).toContain(`'${bucket}'`);
    }
    expect(storageMigration).toContain("false, 52428800");
    expect(storageMigration).toContain("public.can_access_object");
    expect(storageMigration).toContain("auth.uid()::text");
  });

  it("audits business entities without retaining common PII fields", () => {
    expect(auditMigration).toContain("audit_entity_change");
    expect(auditMigration).toContain("activity_logs_immutable");
    expect(auditMigration).toContain("array['email', 'phone', 'avatar_url', 'url']");
    expect(auditMigration).toContain("revoke all on function public.audit_entity_change()");
  });

  it("defines workforce, plan-fact and financial entities", () => {
    for (const table of ["teams", "employees", "team_members", "team_assignments", "work_standards", "object_work_plans", "daily_work_reports", "manpower_requests", "contracts", "budget_items", "financial_transactions"]) {
      expect(workforceFinance).toContain(`create table public.${table}`);
    }
    expect(workforceFinance).toContain("create view public.object_delivery_summary");
    expect(workforceFinance).toContain("create view public.object_financial_summary");
  });

  it("keeps financial data outside ITR policies", () => {
    expect(workforceFinanceRls).toContain("create policy financial_transactions_select");
    expect(workforceFinanceRls).toContain("public.has_admin_access()");
    expect(workforceFinanceRls).toContain("public.current_app_role() in ('creator', 'company_head')");
  });
});
