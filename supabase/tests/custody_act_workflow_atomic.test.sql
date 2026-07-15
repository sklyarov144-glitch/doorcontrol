begin;

select plan(11);

insert into public.companies (id, name)
values ('40000000-0000-0000-0000-000000000001', 'Атомарный акт ОХ');

insert into public.user_invitations (company_id, email, name, role)
values (
  '40000000-0000-0000-0000-000000000001',
  'custody-workflow@example.test',
  'Custody workflow ITR',
  'itr'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '41000000-0000-0000-0000-000000000001',
  'custody-workflow@example.test',
  '{"company_id":"40000000-0000-0000-0000-000000000001","name":"Custody workflow ITR","role":"itr"}'
);

insert into public.objects (id, company_id, name)
values (
  '42000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'Объект акта'
);

insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id)
values (
  '43000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  'Корпус акта',
  1,
  '41000000-0000-0000-0000-000000000001'
);

insert into public.floors (id, building_id, floor_number)
values (
  '44000000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001',
  1
);

insert into public.doors (id, floor_id, label, mark, type) values
  ('45000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment'),
  ('45000000-0000-0000-0000-000000000002', '44000000-0000-0000-0000-000000000001', 'Квартира 2', 'Д-2', 'apartment');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);

select has_function(
  'public',
  'save_custody_act_workflow',
  array['uuid', 'jsonb', 'jsonb', 'jsonb'],
  'atomic custody act workflow RPC exists'
);

select lives_ok(
  $$select public.save_custody_act_workflow(
    '45000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"акт загружен","tn_status":"не передано","x":20,"y":30,"meta":{"custodyActUrl":"https://disk.example/act-1"}}',
    '{"status":"акт загружен","uploaded_at":"2026-07-15T08:00:00Z"}',
    '{"title":"Акт ОХ · Д-1","url":"https://disk.example/act-1","comment":"Пилотный акт"}'
  )$$,
  'ITR saves door, document and act atomically'
);

select is(
  (select custody_act_status from public.doors where id = '45000000-0000-0000-0000-000000000001'),
  'акт загружен',
  'door receives uploaded act status'
);
select is(
  (select status from public.custody_acts where door_id = '45000000-0000-0000-0000-000000000001'),
  'акт загружен',
  'act registry receives the same status'
);
select is(
  (select count(*)::integer from public.document_items where door_id = '45000000-0000-0000-0000-000000000001' and category = 'custody_act'),
  1,
  'one linked custody document is created'
);
select isnt(
  (select uploaded_at from public.custody_acts where door_id = '45000000-0000-0000-0000-000000000001'),
  null,
  'act upload time is recorded'
);

select lives_ok(
  $$select public.save_custody_act_workflow(
    '45000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"передано по акту","tn_status":"не передано","x":20,"y":30,"meta":{"custodyActUrl":"https://disk.example/act-1"}}',
    '{"status":"передано по акту","closed_at":"2026-07-15T10:00:00Z"}',
    null
  )$$,
  'existing act is closed without creating another document'
);
select is(
  (select status from public.custody_acts where door_id = '45000000-0000-0000-0000-000000000001'),
  'передано по акту',
  'act is closed'
);
select isnt(
  (select closed_at from public.custody_acts where door_id = '45000000-0000-0000-0000-000000000001'),
  null,
  'act close time is recorded'
);

insert into public.document_items (
  id, company_id, object_id, building_id, floor_id, door_id, title, category, url
) values (
  '46000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  '45000000-0000-0000-0000-000000000002',
  'Чужой акт',
  'custody_act',
  'https://disk.example/foreign-act'
);

select throws_ok(
  $$select public.save_custody_act_workflow(
    '45000000-0000-0000-0000-000000000001',
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","opening_number":1,"status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"не передана","tn_status":"не передано","x":20,"y":30,"meta":{}}',
    '{"status":"не передана","document_id":"46000000-0000-0000-0000-000000000001"}',
    null
  )$$,
  '22023',
  'Custody document does not belong to the door',
  'foreign door document is rejected'
);
select is(
  (select custody_act_status from public.doors where id = '45000000-0000-0000-0000-000000000001'),
  'передано по акту',
  'rejected document rolls the door change back'
);

select * from finish();

rollback;
