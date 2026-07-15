begin;

select plan(4);

insert into public.companies (id, name) values
  ('71000000-0000-0000-0000-000000000001', 'Invitation Company A'),
  ('71000000-0000-0000-0000-000000000002', 'Invitation Company B');

insert into public.user_invitations (id, company_id, email, name, role) values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'shared@example.test', 'Head A', 'company_head'),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'shared@example.test', 'Head B', 'company_head');

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values
    ('73000000-0000-0000-0000-000000000001', 'shared@example.test', '{}'::jsonb)$$,
  'P0001',
  'A unique valid user invitation is required',
  'an ambiguous email cannot choose a company implicitly'
);

select lives_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values
    ('73000000-0000-0000-0000-000000000002', 'shared@example.test',
     '{"invitation_id":"72000000-0000-0000-0000-000000000001"}'::jsonb)$$,
  'the pinned invitation creates the Auth user'
);

select is(
  (select company_id from public.profiles where id = '73000000-0000-0000-0000-000000000002'),
  '71000000-0000-0000-0000-000000000001'::uuid,
  'the profile belongs to the company named by invitation_id'
);

select is(
  (select status::text from public.user_invitations where id = '72000000-0000-0000-0000-000000000002'),
  'pending',
  'the other company invitation remains untouched'
);

select * from finish();

rollback;
