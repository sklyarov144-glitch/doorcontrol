begin;

select plan(13);

insert into public.companies (id, name) values
  ('50000000-0000-0000-0000-000000000001', 'Scope Company A'),
  ('50000000-0000-0000-0000-000000000002', 'Scope Company B');

insert into public.user_invitations (company_id, email, name, role) values
  ('50000000-0000-0000-0000-000000000001', 'scope-head@example.test', 'Scope Head', 'company_head'),
  ('50000000-0000-0000-0000-000000000001', 'scope-itr@example.test', 'Scope ITR', 'itr');

insert into auth.users (id, email, raw_user_meta_data) values
  ('51000000-0000-0000-0000-000000000001', 'scope-head@example.test', '{"company_id":"50000000-0000-0000-0000-000000000001","name":"Scope Head","role":"company_head"}'),
  ('51000000-0000-0000-0000-000000000002', 'scope-itr@example.test', '{"company_id":"50000000-0000-0000-0000-000000000001","name":"Scope ITR","role":"itr"}');

insert into public.objects (id, company_id, name) values
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Scope Object A'),
  ('52000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Scope Object B');

insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id) values
  ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'Assigned Building', 1, '51000000-0000-0000-0000-000000000002'),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', 'Sibling Building', 1, null),
  ('53000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000002', 'Foreign Building', 1, null);

insert into public.floors (id, building_id, floor_number) values
  ('54000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 1),
  ('54000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000002', 1),
  ('54000000-0000-0000-0000-000000000003', '53000000-0000-0000-0000-000000000003', 1);

insert into public.doors (id, floor_id, label, mark, type) values
  ('55000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment'),
  ('55000000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000002', 'Квартира 1', 'Д-1', 'apartment'),
  ('55000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000003', 'Квартира 1', 'Д-1', 'apartment');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.aal', 'aal2', true);
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.document_items (
    company_id, object_id, building_id, floor_id, door_id, title, url
  ) values (
    '50000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000001',
    '54000000-0000-0000-0000-000000000001',
    '55000000-0000-0000-0000-000000000001',
    'Корректный документ', 'https://example.test/document'
  )$$,
  'a complete document hierarchy is accepted'
);

select throws_ok(
  $$insert into public.document_items (
    company_id, object_id, building_id, title, url
  ) values (
    '50000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000003',
    'Подмена корпуса', 'https://example.test/forged'
  )$$,
  '23514', 'document_items contains an inconsistent domain scope',
  'a document cannot combine object and building from different companies'
);

select throws_ok(
  $$insert into public.document_items (company_id, building_id, title, url) values (
    '50000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000001',
    'Неполный scope', 'https://example.test/incomplete'
  )$$,
  '23514', 'document_items contains an inconsistent domain scope',
  'a building document must include its object ancestor'
);

select throws_ok(
  $$insert into public.tasks (
    company_id, title, object_id, building_id, floor_id, door_id, assigned_to
  ) values (
    '50000000-0000-0000-0000-000000000001', 'Подменённая задача',
    '52000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000001',
    '54000000-0000-0000-0000-000000000001',
    '55000000-0000-0000-0000-000000000003',
    '51000000-0000-0000-0000-000000000002'
  )$$,
  '23514', 'tasks contains an inconsistent domain scope',
  'a task cannot reference a door from another hierarchy'
);

select throws_ok(
  $$insert into public.daily_work_reports (
    object_id, building_id, report_date, created_by
  ) values (
    '52000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000003', current_date,
    '51000000-0000-0000-0000-000000000001'
  )$$,
  '23514', 'daily_work_reports contains an inconsistent domain scope',
  'a work report cannot combine unrelated object and building identifiers'
);

select throws_ok(
  $$insert into public.budget_items (
    company_id, object_id, building_id, category
  ) values (
    '50000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000003', 'Монтаж'
  )$$,
  '23514', 'budget_items contains an inconsistent domain scope',
  'a financial row cannot reference a foreign building'
);

select ok(public.can_access_domain_scope(
  '50000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '55000000-0000-0000-0000-000000000001',
  true
), 'company head can access a valid complete scope');

select is(public.can_access_domain_scope(
  '50000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '55000000-0000-0000-0000-000000000003',
  true
), false, 'authorization rejects a mismatched deepest scope');

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);

select is((select count(*)::integer from public.objects), 1, 'ITR can navigate to the object containing an assigned building');
select is((select count(*)::integer from public.buildings where id = '53000000-0000-0000-0000-000000000001'), 1, 'ITR sees the assigned building');
select is((select count(*)::integer from public.buildings where id = '53000000-0000-0000-0000-000000000002'), 0, 'ITR cannot see an unassigned sibling building');
select is((select count(*)::integer from public.doors where id = '55000000-0000-0000-0000-000000000002'), 0, 'ITR cannot see doors from an unassigned sibling building');
select is((select count(*)::integer from public.document_items), 1, 'ITR sees the correctly scoped document in the assigned building');

select * from finish();
rollback;
