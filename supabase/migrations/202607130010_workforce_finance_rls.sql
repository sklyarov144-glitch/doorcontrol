alter table public.teams enable row level security;
alter table public.employees enable row level security;
alter table public.team_members enable row level security;
alter table public.team_assignments enable row level security;
alter table public.work_standards enable row level security;
alter table public.object_work_plans enable row level security;
alter table public.daily_work_reports enable row level security;
alter table public.manpower_requests enable row level security;
alter table public.contracts enable row level security;
alter table public.budget_items enable row level security;
alter table public.financial_transactions enable row level security;

create or replace function public.can_access_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team_id and t.company_id = public.current_company_id()
      and (
        public.has_admin_access()
        or t.responsible_itr_id = auth.uid()
        or exists (select 1 from public.team_assignments a where a.team_id = t.id and public.can_access_object(a.object_id))
      )
  );
$$;

create policy teams_select on public.teams for select using (public.can_access_team(id));
create policy teams_write on public.teams for all
using (company_id = public.current_company_id() and public.has_admin_access())
with check (company_id = public.current_company_id() and public.has_admin_access());

create policy employees_select on public.employees for select
using (
  company_id = public.current_company_id()
  and (public.has_admin_access() or exists (
    select 1 from public.team_members tm where tm.employee_id = id and public.can_access_team(tm.team_id)
  ))
);
create policy employees_write on public.employees for all
using (company_id = public.current_company_id() and public.has_admin_access())
with check (company_id = public.current_company_id() and public.has_admin_access());

create policy team_members_select on public.team_members for select using (public.can_access_team(team_id));
create policy team_members_write on public.team_members for all
using (public.can_access_team(team_id) and public.has_admin_access())
with check (public.can_access_team(team_id) and public.has_admin_access());

create policy team_assignments_select on public.team_assignments for select using (public.can_access_object(object_id));
create policy team_assignments_write on public.team_assignments for all
using (public.can_access_object(object_id) and public.has_admin_access())
with check (public.can_access_object(object_id) and public.has_admin_access());

create policy work_standards_select on public.work_standards for select
using (company_id = public.current_company_id() and public.has_admin_access());
create policy work_standards_write on public.work_standards for all
using (company_id = public.current_company_id() and public.has_admin_access())
with check (company_id = public.current_company_id() and public.has_admin_access());

create policy object_work_plans_select on public.object_work_plans for select using (public.can_access_object(object_id));
create policy object_work_plans_write on public.object_work_plans for all
using (public.can_access_object(object_id) and public.has_admin_access())
with check (public.can_access_object(object_id) and public.has_admin_access());

create policy daily_work_reports_select on public.daily_work_reports for select using (public.can_access_object(object_id));
create policy daily_work_reports_insert on public.daily_work_reports for insert
with check (public.can_access_object(object_id) and created_by = auth.uid());
create policy daily_work_reports_update on public.daily_work_reports for update
using (public.can_access_object(object_id) and (created_by = auth.uid() or public.has_admin_access()))
with check (public.can_access_object(object_id));

create policy manpower_requests_select on public.manpower_requests for select using (public.can_access_object(object_id));
create policy manpower_requests_insert on public.manpower_requests for insert
with check (public.can_access_object(object_id) and requested_by = auth.uid());
create policy manpower_requests_update on public.manpower_requests for update
using (public.can_access_object(object_id) and (requested_by = auth.uid() or public.has_admin_access()))
with check (public.can_access_object(object_id));

create policy contracts_select on public.contracts for select
using (company_id = public.current_company_id() and public.has_admin_access() and public.can_access_object(object_id));
create policy contracts_write on public.contracts for all
using (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'))
with check (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'));

create policy budget_items_select on public.budget_items for select
using (company_id = public.current_company_id() and public.has_admin_access() and public.can_access_object(object_id));
create policy budget_items_write on public.budget_items for all
using (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'))
with check (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'));

create policy financial_transactions_select on public.financial_transactions for select
using (company_id = public.current_company_id() and public.has_admin_access() and public.can_access_object(object_id));
create policy financial_transactions_write on public.financial_transactions for all
using (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'))
with check (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'));

grant execute on function public.can_access_team(uuid) to authenticated;

