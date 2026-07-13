create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id
    and public.current_app_role() not in ('creator', 'company_head')
    and (
      new.role is distinct from old.role
      or new.company_id is distinct from old.company_id
      or new.status is distinct from old.status
    )
  then
    raise exception 'Changing role, company or status is not allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

