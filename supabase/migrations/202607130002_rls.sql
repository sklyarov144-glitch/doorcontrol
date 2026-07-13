create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('creator', 'company_head', 'construction_director'), false);
$$;

create or replace function public.can_access_object(target_object_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.objects o
    where o.id = target_object_id
      and o.company_id = public.current_company_id()
      and (
        public.current_app_role() in ('creator', 'company_head')
        or o.responsible_director_id = auth.uid()
        or exists (
          select 1 from public.object_assignments oa
          where oa.object_id = o.id and oa.user_id = auth.uid()
        )
        or exists (
          select 1 from public.buildings b
          join public.building_assignments ba on ba.building_id = b.id
          where b.object_id = o.id and ba.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_access_building(target_building_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.buildings b
    where b.id = target_building_id
      and (
        public.can_access_object(b.object_id)
        or b.responsible_itr_id = auth.uid()
        or exists (
          select 1 from public.building_assignments ba
          where ba.building_id = b.id and ba.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.doors enable row level security;
alter table public.object_assignments enable row level security;
alter table public.building_assignments enable row level security;

create policy companies_select on public.companies for select
using (id = public.current_company_id());
create policy companies_update on public.companies for update
using (id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'))
with check (id = public.current_company_id());

create policy profiles_select on public.profiles for select
using (company_id = public.current_company_id());
create policy profiles_update_self on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid() and company_id = public.current_company_id());
create policy profiles_manage on public.profiles for all
using (company_id = public.current_company_id() and public.has_admin_access())
with check (company_id = public.current_company_id() and public.has_admin_access());

create policy objects_select on public.objects for select
using (public.can_access_object(id));
create policy objects_insert on public.objects for insert
with check (
  company_id = public.current_company_id()
  and public.current_app_role() in ('creator', 'company_head')
);
create policy objects_update on public.objects for update
using (public.can_access_object(id) and public.has_admin_access())
with check (company_id = public.current_company_id());
create policy objects_delete on public.objects for delete
using (company_id = public.current_company_id() and public.current_app_role() in ('creator', 'company_head'));

create policy buildings_select on public.buildings for select
using (public.can_access_building(id));
create policy buildings_write on public.buildings for all
using (public.can_access_object(object_id))
with check (public.can_access_object(object_id));

create policy floors_select on public.floors for select
using (public.can_access_building(building_id));
create policy floors_write on public.floors for all
using (public.can_access_building(building_id))
with check (public.can_access_building(building_id));

create policy doors_select on public.doors for select
using (
  exists (
    select 1 from public.floors f
    where f.id = floor_id and public.can_access_building(f.building_id)
  )
);
create policy doors_write on public.doors for all
using (
  exists (
    select 1 from public.floors f
    where f.id = floor_id and public.can_access_building(f.building_id)
  )
)
with check (
  exists (
    select 1 from public.floors f
    where f.id = floor_id and public.can_access_building(f.building_id)
  )
);

create policy object_assignments_select on public.object_assignments for select
using (public.can_access_object(object_id));
create policy object_assignments_manage on public.object_assignments for all
using (public.can_access_object(object_id) and public.has_admin_access())
with check (public.can_access_object(object_id) and public.has_admin_access());

create policy building_assignments_select on public.building_assignments for select
using (public.can_access_building(building_id));
create policy building_assignments_manage on public.building_assignments for all
using (public.can_access_building(building_id) and public.has_admin_access())
with check (public.can_access_building(building_id) and public.has_admin_access());

revoke all on function public.current_company_id() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.has_admin_access() from public;
revoke all on function public.can_access_object(uuid) from public;
revoke all on function public.can_access_building(uuid) from public;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_admin_access() to authenticated;
grant execute on function public.can_access_object(uuid) to authenticated;
grant execute on function public.can_access_building(uuid) to authenticated;

