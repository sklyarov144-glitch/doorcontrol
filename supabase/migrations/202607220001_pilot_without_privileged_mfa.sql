-- Production pilot policy: privileged role writes remain protected by RLS and
-- audit triggers, while the temporary pilot does not require an MFA factor.
create or replace function public.privileged_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true;
$$;

comment on function public.privileged_mfa_satisfied() is
  'Temporary pilot policy: privileged writes remain subject to RLS and audit controls without an MFA factor.';
