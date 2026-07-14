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
          where b.object_id = o.id and b.responsible_itr_id = auth.uid()
        )
        or exists (
          select 1 from public.buildings b
          join public.building_assignments ba on ba.building_id = b.id
          where b.object_id = o.id and ba.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_access_object(uuid) from public, anon;
grant execute on function public.can_access_object(uuid) to authenticated;
