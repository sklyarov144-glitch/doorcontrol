begin;

select plan(8);

select has_function(
  'public',
  'import_pilot_hierarchy',
  array['uuid', 'jsonb'],
  'transactional pilot import function exists'
);

select ok(
  has_function_privilege('service_role', 'public.import_pilot_hierarchy(uuid, jsonb)', 'execute'),
  'service role can execute pilot import'
);

select ok(
  not has_function_privilege('authenticated', 'public.import_pilot_hierarchy(uuid, jsonb)', 'execute'),
  'authenticated browser users cannot execute pilot import'
);

select lives_ok(
  $$select public.import_pilot_hierarchy(
    '10000000-0000-0000-0000-000000000001'::uuid,
    '{
      "objects": [{
        "legacyId": "pgtap-object",
        "name": "Тестовый объект",
        "buildings": [{
          "legacyId": "pgtap-building",
          "name": "Корпус 1",
          "floorsCount": 1,
          "floors": [{
            "legacyId": "pgtap-floor-1",
            "number": 1,
            "doors": [{
              "legacyId": "pgtap-door-1",
              "label": "Квартира 1",
              "mark": "Д-1",
              "type": "apartment",
              "openingNumber": 1,
              "x": 25,
              "y": 40
            }]
          }]
        }]
      }]
    }'::jsonb
  )$$,
  'first import succeeds'
);

select lives_ok(
  $$select public.import_pilot_hierarchy(
    '10000000-0000-0000-0000-000000000001'::uuid,
    '{
      "objects": [{
        "legacyId": "pgtap-object",
        "name": "Тестовый объект обновлён",
        "buildings": [{
          "legacyId": "pgtap-building",
          "name": "Корпус 1",
          "floorsCount": 1,
          "floors": [{
            "legacyId": "pgtap-floor-1",
            "number": 1,
            "doors": [{
              "legacyId": "pgtap-door-1",
              "label": "Квартира 1",
              "mark": "Д-1",
              "type": "apartment",
              "openingNumber": 1,
              "status": "передано по акту",
              "tnStatus": "принято ТН",
              "custodyActStatus": "передано по акту",
              "mountedAt": "2026-07-10T08:00:00Z",
              "tnAcceptedAt": "2026-07-11T08:00:00Z",
              "custodyActUploadedAt": "2026-07-11T09:00:00Z",
              "custodyActClosedAt": "2026-07-12T08:00:00Z",
              "x": 30,
              "y": 45
            }]
          }]
        }]
      }]
    }'::jsonb
  )$$,
  'repeat import succeeds'
);

select is(
  (select count(*)::integer from public.objects where legacy_id = 'pgtap-object'),
  1,
  'repeat import does not duplicate object'
);

select is(
  (select count(*)::integer from public.doors where legacy_id = 'pgtap-door-1' and x = 30 and y = 45),
  1,
  'repeat import updates the same door'
);

select is(
  (
    select jsonb_build_object(
      'mountedAt', mounted_at at time zone 'UTC',
      'tnAcceptedAt', tn_accepted_at at time zone 'UTC',
      'custodyActUploadedAt', custody_act_uploaded_at at time zone 'UTC',
      'custodyActClosedAt', custody_act_closed_at at time zone 'UTC'
    )
    from public.doors
    where legacy_id = 'pgtap-door-1'
  ),
  jsonb_build_object(
    'mountedAt', timestamp '2026-07-10 08:00:00',
    'tnAcceptedAt', timestamp '2026-07-11 08:00:00',
    'custodyActUploadedAt', timestamp '2026-07-11 09:00:00',
    'custodyActClosedAt', timestamp '2026-07-12 08:00:00'
  ),
  'repeat import preserves workflow dates exactly'
);

select * from finish();

rollback;
