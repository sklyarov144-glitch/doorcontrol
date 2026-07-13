drop policy if exists work_standards_select on public.work_standards;

create policy work_standards_select on public.work_standards for select
using (company_id = public.current_company_id());

comment on policy work_standards_select on public.work_standards is
  'Authenticated company users may read production standards; write access remains restricted to management roles.';
