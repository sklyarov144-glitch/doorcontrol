begin;

select plan(5);

insert into public.companies (id, name)
values ('20000000-0000-4000-8000-000000000002', 'Другая компания');

select public.import_pilot_hierarchy(
  '10000000-0000-0000-0000-000000000001'::uuid,
  '{
    "objects": [
      {
        "legacyId": "identity-object-a",
        "name": "Объект A",
        "buildings": [{
          "legacyId": "identity-building-a",
          "name": "Корпус A",
          "floorsCount": 1,
          "floors": [{
            "legacyId": "identity-floor-a",
            "number": 1,
            "doors": [{
              "legacyId": "identity-door-a",
              "label": "Квартира 1",
              "mark": "Д-1",
              "type": "apartment",
              "openingNumber": 1,
              "x": 20,
              "y": 30
            }]
          }]
        }]
      },
      {
        "legacyId": "identity-object-b",
        "name": "Объект B",
        "buildings": [{
          "legacyId": "identity-building-b",
          "name": "Корпус B",
          "floorsCount": 1,
          "floors": [{
            "legacyId": "identity-floor-b",
            "number": 1,
            "doors": []
          }]
        }]
      }
    ]
  }'::jsonb
);

select throws_ok(
  $$update public.objects set company_id = '20000000-0000-4000-8000-000000000002' where legacy_id = 'identity-object-a'$$,
  '23514',
  'Imported objects cannot be moved by changing company_id',
  'imported object cannot move to another company'
);

select throws_ok(
  $$update public.buildings set object_id = (select id from public.objects where legacy_id = 'identity-object-b') where legacy_id = 'identity-building-a'$$,
  '23514',
  'Imported buildings cannot be moved by changing object_id',
  'imported building cannot move to another object'
);

select throws_ok(
  $$update public.floors set building_id = (select id from public.buildings where legacy_id = 'identity-building-b') where legacy_id = 'identity-floor-a'$$,
  '23514',
  'Imported floors cannot be moved by changing building_id',
  'imported floor cannot move to another building'
);

select throws_ok(
  $$update public.doors set floor_id = (select id from public.floors where legacy_id = 'identity-floor-b') where legacy_id = 'identity-door-a'$$,
  '23514',
  'Imported doors cannot be moved by changing floor_id',
  'imported door cannot move to another floor'
);

select throws_ok(
  $$update public.doors set legacy_id = 'identity-door-renamed' where legacy_id = 'identity-door-a'$$,
  '23514',
  'Imported doors legacy identity cannot be changed',
  'imported legacy identity cannot be renamed'
);

select * from finish();

rollback;
