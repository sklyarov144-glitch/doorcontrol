# Импорт пилотных данных

## Подготовка

Скопируйте `pilot/import-template.json` и заполните иерархию объект → корпус → этаж → дверь. `legacyId` должен быть стабильным и уникальным во всём файле; повторный импорт использует его для idempotent upsert. `floorsCount` хранит реальную полную этажность корпуса, а `floors` может содержать только выбранные для пилота этажи. Номер каждого импортируемого этажа должен находиться в диапазоне от `1` до `floorsCount`.

## Проверка без записи

```bash
npm run pilot:validate -- /absolute/path/pilot-data.json
npm run pilot:validate -- /absolute/path/pilot-data.json --strict
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

Service role key используется только в доверенном terminal/CI и никогда не передаётся frontend. Сначала импорт выполняется только в staging. До применения файла создаются реальные пользователи, а их UUID указываются в `responsibleDirectorId`, `responsibleItrId` и при необходимости `assignedUserId`.

Команда с `--apply` останавливается при неназначенной ответственности. Флаг
`--allow-unassigned` разрешён только для контролируемого staging-ремонта и не
должен использоваться при рабочем пилотном импорте.

Импорт вызывает закрытую RPC `import_pilot_hierarchy`: весь файл применяется одной
транзакцией и блокируется от параллельного импорта той же компании. При любой
ошибке изменения откатываются полностью. Повторный запуск выполняет idempotent
upsert с теми же `legacyId`; идентификаторы уже загруженных сущностей менять нельзя.

Поля `responsibleDirectorId`, `responsibleItrId` и `assignedUserId` принимают
только реальные UUID активных профилей той же компании и правильной роли.

## Обязательная сверка после импорта

Тем же файлом и теми же credentials выполните:

```bash
npm run pilot:reconcile -- /absolute/path/pilot-data.json
```

Команда читает фактическое состояние Supabase и проверяет принадлежность компании,
полноту иерархии, отсутствие старых лишних строк, основные поля, координаты и
ответственных. Успешный ответ RPC без успешной сверки не считается подтверждением
переноса данных.
