begin;

select plan(11);

insert into public.companies (id, name)
values ('30000000-0000-0000-0000-000000000001', 'Атомарный workflow');

insert into public.user_invitations (company_id, email, name, role)
values (
  '30000000-0000-0000-0000-000000000001',
  'door-workflow@example.test',
  'Door workflow ITR',
  'itr'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '31000000-0000-0000-0000-000000000001',
  'door-workflow@example.test',
  '{"company_id":"30000000-0000-0000-0000-000000000001","name":"Door workflow ITR","role":"itr"}'
);

insert into public.objects (id, company_id, name)
values (
  '32000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Объект workflow'
);

insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id)
values (
  '33000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  'Корпус workflow',
  1,
  '31000000-0000-0000-0000-000000000001'
);

insert into public.floors (id, building_id, floor_number)
values (
  '34000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  1
);

insert into public.doors (id, floor_id, label, mark, type)
values (
  '35000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000001',
  'Квартира 1',
  'Д-1',
  'apartment'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);

select has_function(
  'public',
  'update_door_workflow',
  array['uuid', 'jsonb', 'jsonb'],
  'atomic door workflow RPC exists'
);

select lives_ok(
  $$select public.update_door_workflow(
    '35000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"есть замечание","custody_act_status":"не передана","tn_status":"не передано","x":20,"y":30,"meta":{}}',
    '{"title":"Замечание ТН","description":"Проверить","status":"открыто","priority":"высокий"}'
  )$$,
  'ITR updates assigned door and issue atomically'
);

select is(
  (select status from public.doors where id = '35000000-0000-0000-0000-000000000001'),
  'смонтирована',
  'door status is updated'
);
select isnt(
  (select mounted_at from public.doors where id = '35000000-0000-0000-0000-000000000001'),
  null,
  'mounted milestone is recorded by the database'
);
select is(
  (select count(*)::integer from public.tn_issues where door_id = '35000000-0000-0000-0000-000000000001' and status <> 'устранено'),
  1,
  'one active issue is created'
);

select lives_ok(
  $$select public.update_door_workflow(
    '35000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"есть замечание","custody_act_status":"не передана","tn_status":"не передано","x":20,"y":30,"meta":{}}',
    '{"title":"Обновлённое замечание","status":"открыто","priority":"средний"}'
  )$$,
  'repeated save updates the active issue'
);
select is(
  (select count(*)::integer from public.tn_issues where door_id = '35000000-0000-0000-0000-000000000001' and status <> 'устранено'),
  1,
  'repeated save does not duplicate the issue'
);

select lives_ok(
  $$select public.update_door_workflow(
    '35000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"не передана","tn_status":"не передано","x":20,"y":30,"meta":{}}',
    '{"title":"Замечание ТН","status":"устранено","priority":"средний"}'
  )$$,
  'workflow resolves the active issue'
);
select is(
  (select count(*)::integer from public.tn_issues where door_id = '35000000-0000-0000-0000-000000000001' and status <> 'устранено'),
  0,
  'resolved issue is no longer active'
);

select throws_ok(
  $$select public.update_door_workflow(
    '35000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"доставлена","opening_status":"готов","issue_status":"есть замечание","custody_act_status":"не передана","tn_status":"не передано","x":20,"y":30,"meta":{}}',
    '{"title":"Невалидное замечание","status":"открыто","priority":"невозможный"}'
  )$$,
  '23514',
  null,
  'invalid issue rolls back the workflow'
);
select is(
  (select status from public.doors where id = '35000000-0000-0000-0000-000000000001'),
  'смонтирована',
  'door update is rolled back when issue persistence fails'
);

select * from finish();

rollback;
