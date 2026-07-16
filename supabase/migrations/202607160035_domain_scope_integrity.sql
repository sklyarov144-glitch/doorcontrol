-- Reject records that combine identifiers from different companies or hierarchy branches.
create or replace function public.scope_hierarchy_matches(
  p_company_id uuid default null,
  p_object_id uuid default null,
  p_building_id uuid default null,
  p_floor_id uuid default null,
  p_door_id uuid default null,
  p_require_complete boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_door_id is not null then exists (
      select 1
      from public.doors d
      join public.floors f on f.id = d.floor_id
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where d.id = p_door_id
        and (p_floor_id is null or p_floor_id = f.id)
        and (p_building_id is null or p_building_id = b.id)
        and (p_object_id is null or p_object_id = o.id)
        and (p_company_id is null or p_company_id = o.company_id)
        and (
          not p_require_complete
          or (p_floor_id is not null and p_building_id is not null and p_object_id is not null)
        )
    )
    when p_floor_id is not null then exists (
      select 1
      from public.floors f
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where f.id = p_floor_id
        and (p_building_id is null or p_building_id = b.id)
        and (p_object_id is null or p_object_id = o.id)
        and (p_company_id is null or p_company_id = o.company_id)
        and (not p_require_complete or (p_building_id is not null and p_object_id is not null))
    )
    when p_building_id is not null then exists (
      select 1
      from public.buildings b
      join public.objects o on o.id = b.object_id
      where b.id = p_building_id
        and (p_object_id is null or p_object_id = o.id)
        and (p_company_id is null or p_company_id = o.company_id)
        and (not p_require_complete or p_object_id is not null)
    )
    when p_object_id is not null then exists (
      select 1
      from public.objects o
      where o.id = p_object_id
        and (p_company_id is null or p_company_id = o.company_id)
    )
    when p_company_id is not null then exists (
      select 1 from public.companies c where c.id = p_company_id
    )
    else false
  end;
$$;

revoke all on function public.scope_hierarchy_matches(uuid, uuid, uuid, uuid, uuid, boolean)
from public, anon, authenticated;

create or replace function public.can_access_domain_scope(
  p_company_id uuid,
  p_object_id uuid default null,
  p_building_id uuid default null,
  p_floor_id uuid default null,
  p_door_id uuid default null,
  p_require_complete boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_company_id = public.current_company_id()
    and public.scope_hierarchy_matches(
      p_company_id,
      p_object_id,
      p_building_id,
      p_floor_id,
      p_door_id,
      p_require_complete
    )
    and case
      when p_door_id is not null then exists (
        select 1
        from public.doors d
        join public.floors f on f.id = d.floor_id
        where d.id = p_door_id and public.can_access_building(f.building_id)
      )
      when p_floor_id is not null then exists (
        select 1
        from public.floors f
        where f.id = p_floor_id and public.can_access_building(f.building_id)
      )
      when p_building_id is not null then public.can_access_building(p_building_id)
      when p_object_id is not null then public.can_access_object(p_object_id)
      else public.has_admin_access()
    end;
$$;

revoke all on function public.can_access_domain_scope(uuid, uuid, uuid, uuid, uuid, boolean)
from public, anon;
grant execute on function public.can_access_domain_scope(uuid, uuid, uuid, uuid, uuid, boolean)
to authenticated;

create or replace function public.enforce_domain_scope_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb := to_jsonb(new);
  company_id uuid := nullif(payload ->> 'company_id', '')::uuid;
  object_id uuid := nullif(payload ->> 'object_id', '')::uuid;
  building_id uuid := nullif(payload ->> 'building_id', '')::uuid;
  floor_id uuid := nullif(payload ->> 'floor_id', '')::uuid;
  door_id uuid := nullif(payload ->> 'door_id', '')::uuid;
  require_complete boolean := coalesce(tg_argv[0], 'false')::boolean;
begin
  if not public.scope_hierarchy_matches(
    company_id,
    object_id,
    building_id,
    floor_id,
    door_id,
    require_complete
  ) then
    raise exception using
      errcode = '23514',
      message = format('%s contains an inconsistent domain scope', tg_table_name);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_domain_scope_hierarchy() from public, anon, authenticated;

create trigger document_items_enforce_scope
before insert or update on public.document_items
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger tasks_enforce_scope
before insert or update on public.tasks
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger notifications_enforce_scope
before insert or update on public.notifications
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger team_assignments_enforce_scope
before insert or update on public.team_assignments
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger object_work_plans_enforce_scope
before insert or update on public.object_work_plans
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger daily_work_reports_enforce_scope
before insert or update on public.daily_work_reports
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger manpower_requests_enforce_scope
before insert or update on public.manpower_requests
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger contracts_enforce_scope
before insert or update on public.contracts
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger budget_items_enforce_scope
before insert or update on public.budget_items
for each row execute function public.enforce_domain_scope_hierarchy('true');

create trigger financial_transactions_enforce_scope
before insert or update on public.financial_transactions
for each row execute function public.enforce_domain_scope_hierarchy('true');

-- Documents must be authorized against their deepest scope, not only object_id.
drop policy if exists document_items_select on public.document_items;
create policy document_items_select on public.document_items for select
using (
  public.can_access_domain_scope(company_id, object_id, building_id, floor_id, door_id, true)
);

drop policy if exists document_items_write on public.document_items;
create policy document_items_write on public.document_items for all
using (
  public.can_access_domain_scope(company_id, object_id, building_id, floor_id, door_id, true)
)
with check (
  public.can_access_domain_scope(company_id, object_id, building_id, floor_id, door_id, true)
);

-- Seeing an object because one building is assigned must not expose sibling buildings to ITR.
create or replace function public.can_access_building(target_building_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.buildings b
    join public.objects o on o.id = b.object_id
    where b.id = target_building_id
      and o.company_id = public.current_company_id()
      and (
        public.current_app_role() in ('creator', 'company_head')
        or (
          public.current_app_role() = 'construction_director'
          and public.can_access_object(o.id)
        )
        or b.responsible_itr_id = auth.uid()
        or exists (
          select 1 from public.building_assignments ba
          where ba.building_id = b.id and ba.user_id = auth.uid()
        )
        or exists (
          select 1 from public.object_assignments oa
          where oa.object_id = o.id and oa.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_access_building(uuid) from public, anon;
grant execute on function public.can_access_building(uuid) to authenticated;

comment on function public.scope_hierarchy_matches(uuid, uuid, uuid, uuid, uuid, boolean) is
  'Validates that company, object, building, floor and door identifiers belong to one hierarchy branch.';
comment on function public.can_access_domain_scope(uuid, uuid, uuid, uuid, uuid, boolean) is
  'Validates a complete hierarchy and authorizes the caller against its deepest available scope.';
