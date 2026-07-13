drop policy if exists profiles_select on public.profiles;

create policy profiles_select on public.profiles for select
using (
  company_id = public.current_company_id()
  and (
    public.current_app_role() in ('creator', 'company_head')
    or id = auth.uid()
    or (
      public.current_app_role() = 'construction_director'
      and role = 'itr'
      and (
        exists (
          select 1 from public.object_assignments oa
          where oa.user_id = profiles.id and public.can_access_object(oa.object_id)
        )
        or exists (
          select 1 from public.building_assignments ba
          where ba.user_id = profiles.id and public.can_access_building(ba.building_id)
        )
        or exists (
          select 1 from public.buildings b
          where b.responsible_itr_id = profiles.id and public.can_access_building(b.id)
        )
      )
    )
    or (
      public.current_app_role() = 'itr'
      and role = 'construction_director'
      and exists (
        select 1 from public.objects o
        where o.responsible_director_id = profiles.id and public.can_access_object(o.id)
      )
    )
  )
);
