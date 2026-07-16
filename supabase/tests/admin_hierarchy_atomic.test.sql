begin;

select plan(12);

insert into public.companies (id, name)
values ('40000000-0000-0000-0000-000000000001', 'Атомарная иерархия');

insert into public.user_invitations (company_id, email, name, role)
values
  ('40000000-0000-0000-0000-000000000001', 'hierarchy-head@example.test', 'Руководитель', 'company_head'),
  ('40000000-0000-0000-0000-000000000001', 'hierarchy-director@example.test', 'Директор', 'construction_director'),
  ('40000000-0000-0000-0000-000000000001', 'hierarchy-itr@example.test', 'ИТР', 'itr');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('41000000-0000-0000-0000-000000000001', 'hierarchy-head@example.test', '{}'),
  ('41000000-0000-0000-0000-000000000002', 'hierarchy-director@example.test', '{}'),
  ('41000000-0000-0000-0000-000000000003', 'hierarchy-itr@example.test', '{}');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.aal', 'aal2', true);
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);

select has_function(
  'public',
  'save_object_hierarchy',
  array['jsonb'],
  'authenticated hierarchy RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'public.save_object_hierarchy(jsonb)', 'execute'),
  'authenticated users can call the guarded RPC'
);
select ok(
  not has_function_privilege('anon', 'public.save_object_hierarchy(jsonb)', 'execute'),
  'anonymous users cannot call the hierarchy RPC'
);

select lives_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"admin-object","name":"Объект","responsibleDirectorId":"41000000-0000-0000-0000-000000000002","buildings":[{"legacyId":"admin-building","name":"Корпус 4.1","floorsCount":1,"responsibleItrId":"41000000-0000-0000-0000-000000000003","floors":[{"legacyId":"admin-floor","number":1,"doors":[{"legacyId":"admin-door","label":"Квартира 1","mark":"Д-1","type":"apartment","openingNumber":1,"x":20,"y":30}]}]}]}]}'::jsonb
  )$$,
  'company head creates the complete hierarchy'
);
select is(
  (select count(*)::integer from public.objects where legacy_id = 'admin-object'),
  1,
  'one object is created'
);

select lives_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"admin-object","name":"Объект обновлён","responsibleDirectorId":"41000000-0000-0000-0000-000000000002","buildings":[{"legacyId":"admin-building","name":"Корпус 4.1","floorsCount":1,"responsibleItrId":"41000000-0000-0000-0000-000000000003","floors":[{"legacyId":"admin-floor","number":1,"doors":[{"legacyId":"admin-door","label":"Квартира 1","mark":"Д-1","type":"apartment","openingNumber":1,"x":25,"y":35}]}]}]}]}'::jsonb
  )$$,
  'repeated hierarchy save is idempotent'
);
select is(
  (select count(*)::integer from public.doors where legacy_id = 'admin-door' and x = 25 and y = 35),
  1,
  'repeated save updates one stable door'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"admin-object","name":"Объект директора","responsibleDirectorId":"41000000-0000-0000-0000-000000000002","buildings":[{"legacyId":"admin-building","name":"Корпус 4.1","floorsCount":1,"responsibleItrId":"41000000-0000-0000-0000-000000000003","floors":[]}]}]}'::jsonb
  )$$,
  'assigned construction director updates an existing object'
);
select throws_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"director-new-object","name":"Новый объект","buildings":[]}]}'::jsonb
  )$$,
  '42501',
  'Only company leadership can create objects',
  'construction director cannot create an object'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"admin-object","name":"Попытка ИТР","buildings":[]}]}'::jsonb
  )$$,
  '42501',
  'Role cannot manage object hierarchy',
  'ITR cannot manage the hierarchy'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.save_object_hierarchy(
    '{"objects":[{"legacyId":"admin-object","name":"Не должно сохраниться","responsibleDirectorId":"41000000-0000-0000-0000-000000000002","buildings":[{"legacyId":"admin-building","name":"Корпус 4.1","floorsCount":1,"floors":[{"legacyId":"admin-floor","number":1,"doors":[{"legacyId":"invalid-door","label":"Ошибка","mark":"X","type":"invalid","x":20,"y":30}]}]}]}]}'::jsonb
  )$$,
  '23514',
  null,
  'invalid nested door rejects the complete save'
);
select is(
  (select name from public.objects where legacy_id = 'admin-object'),
  'Объект директора',
  'nested failure rolls back the object update'
);

select * from finish();

rollback;
