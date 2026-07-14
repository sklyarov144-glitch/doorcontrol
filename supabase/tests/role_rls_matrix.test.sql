begin;

select plan(24);

insert into public.companies (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Компания А'),
  ('20000000-0000-0000-0000-000000000002', 'Компания Б');

insert into public.user_invitations (company_id, email, name, role) values
  ('20000000-0000-0000-0000-000000000001', 'creator-a@example.test', 'Creator A', 'creator'),
  ('20000000-0000-0000-0000-000000000001', 'head-a@example.test', 'Head A', 'company_head'),
  ('20000000-0000-0000-0000-000000000001', 'director-a@example.test', 'Director A', 'construction_director'),
  ('20000000-0000-0000-0000-000000000001', 'itr-a@example.test', 'ITR A', 'itr'),
  ('20000000-0000-0000-0000-000000000002', 'head-b@example.test', 'Head B', 'company_head');

insert into auth.users (id, email, raw_user_meta_data) values
  ('21000000-0000-0000-0000-000000000001', 'creator-a@example.test', '{"company_id":"20000000-0000-0000-0000-000000000001","name":"Creator A","role":"creator"}'),
  ('21000000-0000-0000-0000-000000000002', 'head-a@example.test', '{"company_id":"20000000-0000-0000-0000-000000000001","name":"Head A","role":"company_head"}'),
  ('21000000-0000-0000-0000-000000000003', 'director-a@example.test', '{"company_id":"20000000-0000-0000-0000-000000000001","name":"Director A","role":"construction_director"}'),
  ('21000000-0000-0000-0000-000000000004', 'itr-a@example.test', '{"company_id":"20000000-0000-0000-0000-000000000001","name":"ITR A","role":"itr"}'),
  ('22000000-0000-0000-0000-000000000002', 'head-b@example.test', '{"company_id":"20000000-0000-0000-0000-000000000002","name":"Head B","role":"company_head"}');

insert into public.objects (id, company_id, name, responsible_director_id) values
  ('23000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Объект А1', '21000000-0000-0000-0000-000000000003'),
  ('23000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Объект А2', null),
  ('23000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Объект Б1', null);

insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id) values
  ('24000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Корпус А1', 1, '21000000-0000-0000-0000-000000000004'),
  ('24000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'Корпус А2', 1, null),
  ('24000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000003', 'Корпус Б1', 1, null);

insert into public.floors (id, building_id, floor_number) values
  ('25000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 1),
  ('25000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', 1),
  ('25000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-000000000003', 1);

insert into public.doors (id, floor_id, label, mark, type) values
  ('26000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment'),
  ('26000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'Квартира 1', 'Д-1', 'apartment'),
  ('26000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-000000000003', 'Квартира 1', 'Д-1', 'apartment');

insert into public.financial_transactions (
  id, company_id, object_id, building_id, transaction_type, category, amount, occurred_on
) values
  ('27000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'expense', 'Монтаж', 1000, current_date),
  ('27000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-000000000003', 'expense', 'Монтаж', 2000, current_date);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.objects), 2, 'creator sees every object in own company');
select is((select count(*)::integer from public.objects where company_id = '20000000-0000-0000-0000-000000000002'), 0, 'creator cannot see another company');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.objects), 2, 'company head sees own company objects');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.objects), 1, 'director sees only assigned objects');
select is((select count(*)::integer from public.objects where id = '23000000-0000-0000-0000-000000000002'), 0, 'director cannot see unassigned own-company object');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.objects), 1, 'ITR sees object of responsible building');
select is((select count(*)::integer from public.buildings), 1, 'ITR sees only assigned building');
select is((select count(*)::integer from public.doors where id = '26000000-0000-0000-0000-000000000001'), 1, 'ITR sees door in assigned building');
select is((select count(*)::integer from public.doors where id = '26000000-0000-0000-0000-000000000003'), 0, 'ITR cannot see foreign-company door');

select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.objects), 1, 'second company head sees only second company');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000004', true);
update public.doors set status = 'доставлена'
where id = '26000000-0000-0000-0000-000000000001';
select is((select status from public.doors where id = '26000000-0000-0000-0000-000000000001'), 'доставлена', 'ITR can update assigned door');

update public.doors set status = 'доставлена'
where id = '26000000-0000-0000-0000-000000000003';
reset role;
select is((select status from public.doors where id = '26000000-0000-0000-0000-000000000003'), 'не начато', 'ITR cannot update foreign door');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$insert into public.objects (company_id, name) values ('20000000-0000-0000-0000-000000000001', 'Запрещённый объект ИТР')$$,
  '42501',
  null,
  'ITR cannot create object'
);

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$insert into public.objects (company_id, name) values ('20000000-0000-0000-0000-000000000001', 'Запрещённый объект директора')$$,
  '42501',
  null,
  'director cannot create object'
);

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000002', true);
insert into public.objects (company_id, name)
values ('20000000-0000-0000-0000-000000000001', 'Объект руководителя');
select is((select count(*)::integer from public.objects where name = 'Объект руководителя'), 1, 'company head can create object');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.financial_transactions), 0, 'ITR cannot read finance');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.financial_transactions), 1, 'director reads finance for assigned object');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.financial_transactions), 1, 'company head reads own-company finance');

select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.financial_transactions), 1, 'second company head cannot read first-company finance');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000003', true);
select ok((select count(*) > 0 from public.activity_logs), 'director can read audit for assigned object');
select is((select count(*)::integer from public.activity_logs where object_id = '23000000-0000-0000-0000-000000000002'), 0, 'director cannot read audit for unassigned object');

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000002', true);
select ok((select count(*) > 0 from public.activity_logs where company_id = '20000000-0000-0000-0000-000000000001'), 'company head reads own-company audit');
select is((select count(*)::integer from public.activity_logs where company_id = '20000000-0000-0000-0000-000000000002'), 0, 'company head cannot read foreign-company audit');

reset role;
update public.profiles set status = 'disabled' where id = '21000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.objects), 0, 'disabled user loses object access');

select * from finish();

rollback;
