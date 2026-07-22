begin;

select plan(8);

insert into public.companies (id, name)
values ('70000000-0000-0000-0000-000000000001', 'MFA test company');

insert into public.user_invitations (company_id, email, name, role) values
  ('70000000-0000-0000-0000-000000000001', 'head-mfa@example.test', 'MFA Head', 'company_head'),
  ('70000000-0000-0000-0000-000000000001', 'itr-mfa@example.test', 'MFA ITR', 'itr');

insert into auth.users (id, email, raw_user_meta_data) values
  ('71000000-0000-0000-0000-000000000001', 'head-mfa@example.test', '{}'),
  ('71000000-0000-0000-0000-000000000002', 'itr-mfa@example.test', '{}');

insert into public.objects (id, company_id, name)
values ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'MFA Object');
insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id)
values ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'MFA Building', 1, '71000000-0000-0000-0000-000000000002');
insert into public.floors (id, building_id, floor_number)
values ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 1);
insert into public.doors (id, floor_id, label, mark, type)
values ('75000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.aal', 'aal1', true);

select is(public.privileged_mfa_satisfied(), true, 'pilot privileged aal1 session satisfies the temporary policy');
select is((select count(*)::integer from public.objects), 1, 'privileged aal1 session keeps read access for MFA enrollment');
select lives_ok(
  $$update public.objects set name = 'Allowed in pilot' where id = '72000000-0000-0000-0000-000000000001'$$,
  'privileged aal1 write succeeds during the pilot'
);

select set_config('request.jwt.claim.aal', 'aal2', true);
select is(public.privileged_mfa_satisfied(), true, 'privileged aal2 session satisfies MFA');
select lives_ok(
  $$update public.objects set name = 'Allowed' where id = '72000000-0000-0000-0000-000000000001'$$,
  'privileged aal2 write succeeds'
);

select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.aal', 'aal1', true);
select is(public.privileged_mfa_satisfied(), true, 'ITR does not require privileged MFA');
select lives_ok(
  $$update public.doors set status = 'доставлена' where id = '75000000-0000-0000-0000-000000000001'$$,
  'ITR aal1 operational write succeeds'
);
select is(
  (select status from public.doors where id = '75000000-0000-0000-0000-000000000001'),
  'доставлена',
  'ITR update is persisted'
);

select * from finish();
rollback;
