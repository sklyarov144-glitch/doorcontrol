# Импорт пилотных данных

## Подготовка

Скопируйте `pilot/import-template.json` и заполните иерархию объект → корпус → этаж → дверь. `legacyId` должен быть стабильным и уникальным во всём файле; повторный импорт использует его для idempotent upsert.

## Проверка без записи

```bash
npm run pilot:validate -- /absolute/path/pilot-data.json
npm run pilot:import -- /absolute/path/pilot-data.json
```

Вторая команда также остаётся dry-run без `--apply`.

## Импорт в staging

```bash
export SUPABASE_URL=https://staging-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_COMPANY_ID=...
npm run pilot:import -- /absolute/path/pilot-data.json --apply
```

Service role key используется только в доверенном terminal/CI и никогда не передаётся frontend. Сначала импорт выполняется только в staging. После импорта сверяются counts и выборочные двери, затем назначаются реальные UUID пользователей.

Импорт выполняет idempotent upsert, но не является одной транзакцией для всего файла. При ошибке нужно устранить причину и повторить импорт с теми же `legacyId`; нельзя генерировать новые идентификаторы для уже записанных сущностей.
