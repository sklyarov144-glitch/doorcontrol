create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  security_fields_changed boolean;
begin
  actor_role := public.current_app_role();
  security_fields_changed := (
    new.role is distinct from old.role
    or new.company_id is distinct from old.company_id
    or new.status is distinct from old.status
    or new.email is distinct from old.email
  );

  if auth.uid() = old.id and security_fields_changed then
    raise exception 'Changing your own role, company, status or email is not allowed';
  end if;

  if auth.uid() <> old.id then
    if actor_role = 'creator' then
      null;
    elsif actor_role = 'company_head' then
      if old.role = 'creator' or new.role = 'creator' or new.company_id is distinct from old.company_id then
        raise exception 'Company head cannot manage creator or move profiles between companies';
      end if;
    elsif actor_role = 'construction_director' then
      if old.role <> 'itr' or new.role <> 'itr' or new.company_id is distinct from old.company_id then
        raise exception 'Construction director can manage ITR profiles only';
      end if;
    else
      raise exception 'Profile management is not allowed';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_security_fields() from public, anon, authenticated;
