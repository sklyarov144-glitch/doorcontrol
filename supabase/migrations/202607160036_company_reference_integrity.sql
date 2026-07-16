-- Keep every user and business reference inside the owning company.
create or replace function public.profile_reference_is_valid(
  p_profile_id uuid,
  p_company_id uuid,
  p_required_role public.app_role default null,
  p_require_active boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id is null or exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.company_id = p_company_id
      and (p_required_role is null or p.role = p_required_role)
      and (not p_require_active or p.status = 'active')
  );
$$;

revoke all on function public.profile_reference_is_valid(uuid, uuid, public.app_role, boolean)
from public, anon, authenticated;

create or replace function public.enforce_company_reference_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb := to_jsonb(new);
  old_payload jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  company_id uuid;
  object_id uuid;
  door_id uuid;
  task_id uuid;
  profile_id uuid;
  related_company_id uuid;
  related_object_id uuid;
  document_door_id uuid;
begin
  case tg_table_name
    when 'objects' then
      company_id := (payload ->> 'company_id')::uuid;
      profile_id := nullif(payload ->> 'responsible_director_id', '')::uuid;
      if (
        tg_op = 'INSERT'
        or payload ->> 'company_id' is distinct from old_payload ->> 'company_id'
        or payload ->> 'responsible_director_id' is distinct from old_payload ->> 'responsible_director_id'
      ) and not public.profile_reference_is_valid(profile_id, company_id, 'construction_director', true) then
        raise exception using errcode = '23514', message = 'Object director must be an active construction director from the same company';
      end if;

    when 'buildings' then
      select o.company_id into company_id
      from public.objects o where o.id = (payload ->> 'object_id')::uuid;
      profile_id := nullif(payload ->> 'responsible_itr_id', '')::uuid;
      if (
        tg_op = 'INSERT'
        or payload ->> 'object_id' is distinct from old_payload ->> 'object_id'
        or payload ->> 'responsible_itr_id' is distinct from old_payload ->> 'responsible_itr_id'
      ) and not public.profile_reference_is_valid(profile_id, company_id, 'itr', true) then
        raise exception using errcode = '23514', message = 'Building responsible user must be an active ITR from the same company';
      end if;

    when 'doors' then
      select o.company_id into company_id
      from public.floors f
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where f.id = (payload ->> 'floor_id')::uuid;
      profile_id := nullif(payload ->> 'assigned_user_id', '')::uuid;
      if (
        tg_op = 'INSERT'
        or payload ->> 'floor_id' is distinct from old_payload ->> 'floor_id'
        or payload ->> 'assigned_user_id' is distinct from old_payload ->> 'assigned_user_id'
      ) and not public.profile_reference_is_valid(profile_id, company_id, 'itr', true) then
        raise exception using errcode = '23514', message = 'Door assignee must be an active ITR from the same company';
      end if;

    when 'object_assignments' then
      select o.company_id into company_id
      from public.objects o where o.id = (payload ->> 'object_id')::uuid;
      profile_id := (payload ->> 'user_id')::uuid;
      if not public.profile_reference_is_valid(profile_id, company_id, null, true) then
        raise exception using errcode = '23514', message = 'Object assignment user must be active in the same company';
      end if;

    when 'building_assignments' then
      select o.company_id into company_id
      from public.buildings b
      join public.objects o on o.id = b.object_id
      where b.id = (payload ->> 'building_id')::uuid;
      profile_id := (payload ->> 'user_id')::uuid;
      if not public.profile_reference_is_valid(profile_id, company_id, null, true) then
        raise exception using errcode = '23514', message = 'Building assignment user must be active in the same company';
      end if;

    when 'document_items' then
      company_id := (payload ->> 'company_id')::uuid;
      profile_id := (payload ->> 'created_by')::uuid;
      if not public.profile_reference_is_valid(profile_id, company_id) then
        raise exception using errcode = '23514', message = 'Document creator must belong to the document company';
      end if;

    when 'tasks' then
      company_id := (payload ->> 'company_id')::uuid;
      if not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id)
        or not public.profile_reference_is_valid(nullif(payload ->> 'assigned_to', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Task users must belong to the task company';
      end if;
      if (
        tg_op = 'INSERT'
        or payload ->> 'company_id' is distinct from old_payload ->> 'company_id'
        or payload ->> 'assigned_to' is distinct from old_payload ->> 'assigned_to'
      ) and not public.profile_reference_is_valid(
        nullif(payload ->> 'assigned_to', '')::uuid,
        company_id,
        null,
        true
      ) then
        raise exception using errcode = '23514', message = 'Task assignee must be an active user from the task company';
      end if;

    when 'task_comments' then
      task_id := (payload ->> 'task_id')::uuid;
      select t.company_id into company_id from public.tasks t where t.id = task_id;
      if not public.profile_reference_is_valid(nullif(payload ->> 'user_id', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Task comment author must belong to the task company';
      end if;

    when 'task_links' then
      task_id := (payload ->> 'task_id')::uuid;
      select t.company_id into company_id from public.tasks t where t.id = task_id;
      if not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Task link author must belong to the task company';
      end if;
      if nullif(payload ->> 'document_id', '') is not null then
        select d.company_id into related_company_id
        from public.document_items d where d.id = (payload ->> 'document_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Task link document must belong to the task company';
        end if;
      end if;

    when 'notifications' then
      company_id := (payload ->> 'company_id')::uuid;
      if not public.profile_reference_is_valid(nullif(payload ->> 'user_id', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Notification recipient must belong to the notification company';
      end if;
      if nullif(payload ->> 'task_id', '') is not null then
        select t.company_id into related_company_id
        from public.tasks t where t.id = (payload ->> 'task_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Notification task must belong to the notification company';
        end if;
      end if;

    when 'custody_acts' then
      door_id := (payload ->> 'door_id')::uuid;
      select o.company_id into company_id
      from public.doors d
      join public.floors f on f.id = d.floor_id
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where d.id = door_id;
      if not public.profile_reference_is_valid(nullif(payload ->> 'uploaded_by', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Custody act uploader must belong to the door company';
      end if;
      if nullif(payload ->> 'document_id', '') is not null then
        select d.company_id, d.door_id into related_company_id, document_door_id
        from public.document_items d where d.id = (payload ->> 'document_id')::uuid;
        if related_company_id is distinct from company_id or document_door_id is distinct from door_id then
          raise exception using errcode = '23514', message = 'Custody act document must be linked to the same door';
        end if;
      end if;

    when 'tn_issues' then
      select o.company_id into company_id
      from public.doors d
      join public.floors f on f.id = d.floor_id
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where d.id = (payload ->> 'door_id')::uuid;
      if not public.profile_reference_is_valid(nullif(payload ->> 'responsible_id', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'TN issue assignee must belong to the door company';
      end if;
      if (
        tg_op = 'INSERT'
        or payload ->> 'door_id' is distinct from old_payload ->> 'door_id'
        or payload ->> 'responsible_id' is distinct from old_payload ->> 'responsible_id'
      ) and not public.profile_reference_is_valid(
        nullif(payload ->> 'responsible_id', '')::uuid,
        company_id,
        null,
        true
      ) then
        raise exception using errcode = '23514', message = 'TN issue assignee must be active in the door company';
      end if;

    when 'activity_logs' then
      company_id := (payload ->> 'company_id')::uuid;
      if not public.profile_reference_is_valid(nullif(payload ->> 'user_id', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Audit actor must belong to the audit company';
      end if;

    when 'teams' then
      company_id := (payload ->> 'company_id')::uuid;
      if (
        tg_op = 'INSERT'
        or payload ->> 'company_id' is distinct from old_payload ->> 'company_id'
        or payload ->> 'responsible_itr_id' is distinct from old_payload ->> 'responsible_itr_id'
      ) and not public.profile_reference_is_valid(nullif(payload ->> 'responsible_itr_id', '')::uuid, company_id, 'itr', true) then
        raise exception using errcode = '23514', message = 'Team responsible user must be an active ITR from the same company';
      end if;

    when 'team_members' then
      select t.company_id, e.company_id into company_id, related_company_id
      from public.teams t
      cross join public.employees e
      where t.id = (payload ->> 'team_id')::uuid
        and e.id = (payload ->> 'employee_id')::uuid;
      if related_company_id is distinct from company_id then
        raise exception using errcode = '23514', message = 'Team member must belong to the team company';
      end if;

    when 'team_assignments' then
      object_id := (payload ->> 'object_id')::uuid;
      select o.company_id into company_id from public.objects o where o.id = object_id;
      select t.company_id into related_company_id
      from public.teams t where t.id = (payload ->> 'team_id')::uuid;
      if related_company_id is distinct from company_id
        or not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id)
      then
        raise exception using errcode = '23514', message = 'Team assignment references must belong to the object company';
      end if;

    when 'object_work_plans' then
      object_id := (payload ->> 'object_id')::uuid;
      select o.company_id into company_id from public.objects o where o.id = object_id;
      if nullif(payload ->> 'work_standard_id', '') is not null then
        select s.company_id into related_company_id
        from public.work_standards s where s.id = (payload ->> 'work_standard_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Work plan standard must belong to the object company';
        end if;
      end if;
      if nullif(payload ->> 'team_id', '') is not null then
        select t.company_id into related_company_id
        from public.teams t where t.id = (payload ->> 'team_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Work plan team must belong to the object company';
        end if;
      end if;
      if not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Work plan creator must belong to the object company';
      end if;

    when 'daily_work_reports' then
      object_id := (payload ->> 'object_id')::uuid;
      select o.company_id into company_id from public.objects o where o.id = object_id;
      if nullif(payload ->> 'work_standard_id', '') is not null then
        select s.company_id into related_company_id
        from public.work_standards s where s.id = (payload ->> 'work_standard_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Work report standard must belong to the object company';
        end if;
      end if;
      if nullif(payload ->> 'team_id', '') is not null then
        select t.company_id into related_company_id
        from public.teams t where t.id = (payload ->> 'team_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Work report team must belong to the object company';
        end if;
      end if;
      if not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Work report creator must belong to the object company';
      end if;

    when 'manpower_requests' then
      object_id := (payload ->> 'object_id')::uuid;
      select o.company_id into company_id from public.objects o where o.id = object_id;
      if not public.profile_reference_is_valid((payload ->> 'requested_by')::uuid, company_id)
        or not public.profile_reference_is_valid(nullif(payload ->> 'decided_by', '')::uuid, company_id)
      then
        raise exception using errcode = '23514', message = 'Manpower request users must belong to the object company';
      end if;

    when 'financial_transactions' then
      company_id := (payload ->> 'company_id')::uuid;
      object_id := (payload ->> 'object_id')::uuid;
      if nullif(payload ->> 'contract_id', '') is not null then
        select c.company_id, c.object_id into related_company_id, related_object_id
        from public.contracts c where c.id = (payload ->> 'contract_id')::uuid;
        if related_company_id is distinct from company_id or related_object_id is distinct from object_id then
          raise exception using errcode = '23514', message = 'Financial transaction contract must belong to the same object';
        end if;
      end if;
      if nullif(payload ->> 'team_id', '') is not null then
        select t.company_id into related_company_id
        from public.teams t where t.id = (payload ->> 'team_id')::uuid;
        if related_company_id is distinct from company_id then
          raise exception using errcode = '23514', message = 'Financial transaction team must belong to the same company';
        end if;
      end if;
      if not public.profile_reference_is_valid(nullif(payload ->> 'created_by', '')::uuid, company_id) then
        raise exception using errcode = '23514', message = 'Financial transaction creator must belong to the same company';
      end if;
  end case;

  return new;
end;
$$;

revoke all on function public.enforce_company_reference_integrity() from public, anon, authenticated;

create trigger objects_enforce_company_references before insert or update on public.objects
for each row execute function public.enforce_company_reference_integrity();
create trigger buildings_enforce_company_references before insert or update on public.buildings
for each row execute function public.enforce_company_reference_integrity();
create trigger doors_enforce_company_references before insert or update on public.doors
for each row execute function public.enforce_company_reference_integrity();
create trigger object_assignments_enforce_company_references before insert or update on public.object_assignments
for each row execute function public.enforce_company_reference_integrity();
create trigger building_assignments_enforce_company_references before insert or update on public.building_assignments
for each row execute function public.enforce_company_reference_integrity();
create trigger document_items_enforce_company_references before insert or update on public.document_items
for each row execute function public.enforce_company_reference_integrity();
create trigger tasks_enforce_company_references before insert or update on public.tasks
for each row execute function public.enforce_company_reference_integrity();
create trigger task_comments_enforce_company_references before insert or update on public.task_comments
for each row execute function public.enforce_company_reference_integrity();
create trigger task_links_enforce_company_references before insert or update on public.task_links
for each row execute function public.enforce_company_reference_integrity();
create trigger notifications_enforce_company_references before insert or update on public.notifications
for each row execute function public.enforce_company_reference_integrity();
create trigger custody_acts_enforce_company_references before insert or update on public.custody_acts
for each row execute function public.enforce_company_reference_integrity();
create trigger tn_issues_enforce_company_references before insert or update on public.tn_issues
for each row execute function public.enforce_company_reference_integrity();
create trigger activity_logs_enforce_company_references before insert on public.activity_logs
for each row execute function public.enforce_company_reference_integrity();
create trigger teams_enforce_company_references before insert or update on public.teams
for each row execute function public.enforce_company_reference_integrity();
create trigger team_members_enforce_company_references before insert or update on public.team_members
for each row execute function public.enforce_company_reference_integrity();
create trigger team_assignments_enforce_company_references before insert or update on public.team_assignments
for each row execute function public.enforce_company_reference_integrity();
create trigger object_work_plans_enforce_company_references before insert or update on public.object_work_plans
for each row execute function public.enforce_company_reference_integrity();
create trigger daily_work_reports_enforce_company_references before insert or update on public.daily_work_reports
for each row execute function public.enforce_company_reference_integrity();
create trigger manpower_requests_enforce_company_references before insert or update on public.manpower_requests
for each row execute function public.enforce_company_reference_integrity();
create trigger financial_transactions_enforce_company_references before insert or update on public.financial_transactions
for each row execute function public.enforce_company_reference_integrity();

comment on function public.enforce_company_reference_integrity() is
  'Prevents cross-company responsibility, workforce, task, document and finance references.';
