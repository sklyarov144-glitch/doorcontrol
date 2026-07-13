insert into public.companies (id, name)
values ('10000000-0000-0000-0000-000000000001', 'ГРОСС')
on conflict (id) do nothing;

-- Auth users are created through Supabase Auth. Pass company_id, name, role and
-- position in user metadata so handle_new_user() creates the matching profile.

