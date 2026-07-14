create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  name text not null,
  role public.app_role not null,
  position text,
  invited_by uuid references public.profiles(id) on delete set null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

create unique index user_invitations_pending_email_idx
on public.user_invitations (company_id, lower(email))
where status = 'pending';

create index user_invitations_company_created_idx
on public.user_invitations (company_id, created_at desc);

create trigger user_invitations_set_updated_at before update on public.user_invitations
for each row execute function public.set_updated_at();

alter table public.user_invitations enable row level security;

create policy user_invitations_select on public.user_invitations
for select to authenticated
using (company_id = public.current_company_id() and public.has_admin_access());

revoke all on public.user_invitations from public, anon;
grant select on public.user_invitations to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.user_invitations;
begin
  select * into invitation
  from public.user_invitations
  where lower(email) = lower(new.email)
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
