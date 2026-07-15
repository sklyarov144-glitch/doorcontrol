create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.user_invitations;
  invitation_id uuid := public.try_uuid(new.raw_user_meta_data ->> 'invitation_id');
  invitation_count integer;
begin
  if invitation_id is null then
    select count(*) into invitation_count
    from public.user_invitations
    where lower(email) = lower(new.email)
      and status = 'pending'
      and expires_at > now();

    if invitation_count <> 1 then
      raise exception 'A unique valid user invitation is required';
    end if;
  end if;

  select * into invitation
  from public.user_invitations
  where (invitation_id is null or id = invitation_id)
    and lower(email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if invitation.id is null then
    raise exception 'A valid user invitation is required';
  end if;

  insert into public.profiles (id, company_id, name, role, position, email)
  values (
    new.id,
    invitation.company_id,
    invitation.name,
    invitation.role,
    invitation.position,
    lower(new.email)
  );

  update public.user_invitations
  set status = 'accepted', accepted_user_id = new.id, accepted_at = now()
  where id = invitation.id;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

comment on function public.handle_new_user() is
  'Creates a profile only from the invitation pinned in Auth user metadata; ambiguous legacy invitations are rejected.';
