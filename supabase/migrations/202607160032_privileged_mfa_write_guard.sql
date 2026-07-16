create or replace function public.privileged_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_app_role() not in ('creator', 'company_head', 'construction_director')
    or coalesce(
      auth.jwt() ->> 'aal',
      nullif(current_setting('request.jwt.claim.aal', true), ''),
      'aal1'
    ) = 'aal2',
    true
  );
$$;

create or replace function public.guard_privileged_mfa_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.privileged_mfa_satisfied() then
    raise exception using
      errcode = '42501',
      message = 'MFA verification is required for privileged writes';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_name text;
  protected_tables constant text[] := array[
    'companies', 'profiles', 'objects', 'buildings', 'floors', 'doors',
    'object_assignments', 'building_assignments', 'user_invitations',
    'document_items', 'tasks', 'task_comments', 'task_links', 'notifications',
    'custody_acts', 'tn_issues', 'activity_logs', 'teams', 'employees',
    'team_members', 'team_assignments', 'work_standards', 'object_work_plans',
    'daily_work_reports', 'manpower_requests', 'contracts', 'budget_items',
    'financial_transactions'
  ];
begin
  foreach table_name in array protected_tables loop
    execute format('drop trigger if exists privileged_mfa_write_guard on public.%I', table_name);
    execute format(
      'create trigger privileged_mfa_write_guard before insert or update or delete on public.%I for each row execute function public.guard_privileged_mfa_write()',
      table_name
    );
  end loop;
end;
$$;

revoke all on function public.privileged_mfa_satisfied() from public, anon;
revoke all on function public.guard_privileged_mfa_write() from public, anon, authenticated;
grant execute on function public.privileged_mfa_satisfied() to authenticated;
