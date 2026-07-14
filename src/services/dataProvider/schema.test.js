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
const profilePrivilegeGuard = readFileSync(
  resolve("supabase/migrations/202607140011_profile_privilege_guard.sql"),
  "utf8"
);
const atomicProfileAssignments = readFileSync(
  resolve("supabase/migrations/202607140012_atomic_profile_assignments.sql"),
  "utf8"
);
const profileVisibilityRls = readFileSync(
  resolve("supabase/migrations/202607140013_profile_visibility_rls.sql"),
  "utf8"
);
const workStandardsVisibility = readFileSync(
  resolve("supabase/migrations/202607140014_work_standards_visibility.sql"),
  "utf8"
);
const deliverySummaryDistinctDoors = readFileSync(
  resolve("supabase/migrations/202607140015_delivery_summary_distinct_doors.sql"),
  "utf8"
);
const taskAccessAndNotifications = readFileSync(
  resolve("supabase/migrations/202607140016_task_access_and_notifications.sql"),
  "utf8"
);
const scheduledOverdueTasks = readFileSync(
  resolve("supabase/migrations/202607140017_scheduled_overdue_tasks.sql"),
  "utf8"
);
const transactionalPilotImport = readFileSync(
  resolve("supabase/migrations/202607140018_transactional_pilot_import.sql"),
  "utf8"
);
const scopedImmutableAudit = readFileSync(
  resolve("supabase/migrations/202607140019_scoped_immutable_audit.sql"),
  "utf8"
);
const grantAuditRead = readFileSync(
  resolve("supabase/migrations/202607140020_grant_audit_read.sql"),
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

  it("enforces role hierarchy for profile management", () => {
    expect(profilePrivilegeGuard).toContain("auth.uid() = old.id and security_fields_changed");
    expect(profilePrivilegeGuard).toContain("Company head cannot manage creator");
    expect(profilePrivilegeGuard).toContain("Construction director can manage ITR profiles only");
    expect(profilePrivilegeGuard).toContain("new.email is distinct from old.email");
  });

  it("updates profile assignments atomically under caller RLS", () => {
    expect(atomicProfileAssignments).toContain("function public.save_profile_assignments");
    expect(atomicProfileAssignments).toContain("security invoker");
    expect(atomicProfileAssignments).toContain("delete from public.object_assignments");
    expect(atomicProfileAssignments).toContain("delete from public.building_assignments");
    expect(atomicProfileAssignments).toContain("grant execute");
  });

  it("limits profile visibility by role and shared object scope", () => {
    expect(profileVisibilityRls).toContain("drop policy if exists profiles_select");
    expect(profileVisibilityRls).toContain("public.current_app_role() in ('creator', 'company_head')");
    expect(profileVisibilityRls).toContain("public.current_app_role() = 'construction_director'");
    expect(profileVisibilityRls).toContain("public.current_app_role() = 'itr'");
    expect(profileVisibilityRls).toContain("public.can_access_building");
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

  it("scopes immutable audit events and blocks browser-side forgery", () => {
    expect(scopedImmutableAudit).toContain("add column object_id uuid");
    expect(scopedImmutableAudit).toContain("drop policy if exists activity_logs_insert");
    expect(scopedImmutableAudit).toContain("revoke insert, update, delete on public.activity_logs from anon, authenticated");
    expect(scopedImmutableAudit).toContain("public.can_access_object(object_id)");
    expect(scopedImmutableAudit).toContain("financial_transactions");
    expect(grantAuditRead).toContain("grant select on public.activity_logs to authenticated");
    expect(grantAuditRead).toContain("revoke insert, update, delete");
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

  it("lets company users read standards while keeping management-only writes", () => {
    expect(workStandardsVisibility).toContain("create policy work_standards_select");
    expect(workStandardsVisibility).toContain("company_id = public.current_company_id()");
    expect(workforceFinanceRls).toContain("create policy work_standards_write");
    expect(workforceFinanceRls).toContain("public.has_admin_access()");
  });

  it("counts unique doors in delivery KPI views", () => {
    expect(deliverySummaryDistinctDoors).toContain("count(distinct d.id) as doors_total");
    expect(deliverySummaryDistinctDoors).toContain("count(distinct d.id) filter");
    expect(deliverySummaryDistinctDoors).toContain("count(distinct i.id) filter");
  });

  it("restricts ITR task access and protects task business fields", () => {
    expect(taskAccessAndNotifications).toContain("or t.assigned_to = auth.uid()");
    expect(taskAccessAndNotifications).toContain("public.current_app_role() = 'construction_director'");
    expect(taskAccessAndNotifications).toContain("create policy tasks_update");
    expect(taskAccessAndNotifications).toContain("Assigned users may update only task status");
    expect(taskAccessAndNotifications).toContain("task_comments_notify");
    expect(taskAccessAndNotifications).toContain("task_links_notify");
  });

  it("schedules server-side overdue task control without browser access", () => {
    expect(scheduledOverdueTasks).toContain("create extension if not exists pg_cron");
    expect(scheduledOverdueTasks).toContain("function public.sync_all_overdue_door_tasks");
    expect(scheduledOverdueTasks).toContain("security definer");
    expect(scheduledOverdueTasks).toContain("on conflict (automatic_key) do nothing");
    expect(scheduledOverdueTasks).toContain("revoke all on function public.sync_all_overdue_door_tasks() from public, anon, authenticated");
    expect(scheduledOverdueTasks).toContain("gross-sync-overdue-door-tasks");
    expect(scheduledOverdueTasks).toContain("*/30 * * * *");
  });

  it("imports pilot hierarchy atomically through a service-only function", () => {
    expect(transactionalPilotImport).toContain("function public.import_pilot_hierarchy");
    expect(transactionalPilotImport).toContain("pg_advisory_xact_lock");
    expect(transactionalPilotImport).toContain("on conflict (legacy_id) do update");
    expect(transactionalPilotImport).toContain("belongs to another company");
    expect(transactionalPilotImport).toContain("revoke all on function public.import_pilot_hierarchy(uuid, jsonb) from public, anon, authenticated");
    expect(transactionalPilotImport).toContain("grant execute on function public.import_pilot_hierarchy(uuid, jsonb) to service_role");
  });
});
