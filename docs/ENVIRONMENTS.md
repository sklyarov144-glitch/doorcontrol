# Среды и секреты

## Разделение сред

Staging и production должны использовать разные Supabase projects, Vercel projects, Sentry environments и наборы пользователей. Production-данные нельзя копировать в staging без обезличивания.

## Vercel environment variables

Для Preview (staging) и Production задаются отдельно:

| Переменная | Назначение |
| --- | --- |
| `VITE_DATA_PROVIDER=supabase` | Запрещает использование localStorage как источника production-данных |
| `VITE_SUPABASE_URL` | URL соответствующего Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Публичный anon key; доступ ограничен RLS |
| `VITE_SENTRY_DSN` | DSN frontend-проекта Sentry |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | `0.1` для старта, затем корректируется по объёму |
| `VITE_APP_RELEASE` | SHA коммита или номер релиза |
| `VITE_APP_URL` | Канонический URL среды |

Service role key, пароль БД и токены деплоя никогда не задаются как `VITE_*`.

## GitHub Environment secrets

В environments `staging` и `production`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (обязателен для production)

GitHub Environment variable (не secret):

- `APP_ALLOWED_ORIGINS` — точный список frontend origins через запятую, например `https://app.gross.ru,https://gross-staging.vercel.app`. Production deployment останавливается, если значение не задано.
- `APP_PUBLIC_URL` — канонический HTTPS origin среды без пути и завершающего `/`.

Для автоматической проверки ролей в staging и production задаются отдельные тестовые аккаунты соответствующей среды:

- `AUTH_SMOKE_SUPABASE_URL`, `AUTH_SMOKE_SUPABASE_ANON_KEY`;
- пары `AUTH_SMOKE_<ROLE>_EMAIL` / `AUTH_SMOKE_<ROLE>_PASSWORD` для
  `CREATOR`, `COMPANY_HEAD`, `CONSTRUCTION_DIRECTOR`, `ITR`.
- для production: `AUTH_SMOKE_<ROLE>_TOTP_SECRET` для `CREATOR`,
  `COMPANY_HEAD`, `CONSTRUCTION_DIRECTOR`.

Это технические пользователи без персональных данных. Production-аккаунты должны
быть назначены только на отдельный контрольный объект. Если набор неполный,
workflow завершается ошибкой и не выдаёт отсутствие Auth smoke за успешную проверку.

Только для `production` backup:

- `SUPABASE_DB_URL` — direct database connection string;
- `BACKUP_ENCRYPTION_PASSWORD` — отдельный длинный секрет, хранимый также в корпоративном password manager.
- `BACKUP_SUPABASE_URL` — URL production Supabase для выгрузки Storage;
- `BACKUP_SUPABASE_SERVICE_ROLE_KEY` — service role только для backup/restore workflow.
- `UAT_EVIDENCE_JSON` — полный подписанный UAT JSON для конкретного staging SHA.
- `PILOT_RECONCILIATION_EVIDENCE_JSON` — результат точной post-import сверки
  пилотной иерархии для выпускаемого staging SHA.
- `RESTORE_EVIDENCE_JSON` — evidence последнего успешного restore drill; на момент
  выпуска он должен быть не старше 30 дней, а восстановление укладываться в RTO 4 часа.

Production environment должен требовать ручного approve владельцем продукта или техническим ответственным.

## Supabase Auth URLs

Deploy workflow применяет и затем читает обратно hosted Auth configuration командой
`npm run supabase:auth:configure`. Инварианты для каждой среды:

- Site URL равен `APP_PUBLIC_URL`;
- allowlist содержит origin среды и `<origin>/reset-password`;
- публичная регистрация отключена;
- email/password вход приглашённых пользователей включён;
- phone signup отключён, смена пароля требует повторной аутентификации.

Для проверки без изменения конфигурации используйте `npm run supabase:auth:check`.
Обе команды требуют `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` и
`APP_PUBLIC_URL`, не печатают токен и завершаются ошибкой при remote drift.
Localhost остаётся только в локальном `supabase/config.toml`.

Перед выпуском выполните `npm run verify:deployment`. Скрипт проверяет HTTPS,
совпадение `APP_PUBLIC_URL` с allowlist, соответствие `VITE_SUPABASE_URL`
конкретному `SUPABASE_PROJECT_ID` и наличие всех deployment credentials,
не печатая значения секретов.

Текущий состав GitHub Environments проверяется без чтения значений секретов:

```bash
npm run deployment:audit
npm run deployment:audit -- production --strict
```

Второй вариант завершается ошибкой, пока обязательный production inventory не
собран полностью. Отдельное предупреждение сообщает об отсутствии Sentry в
staging, где DSN пока не является блокирующим deployment secret.

## Безопасная загрузка GitHub Environment

После входа командой `gh auth login` экспортируйте значения в текущем терминале и
сначала выполните dry-run:

```bash
GITHUB_REPOSITORY=sklyarov144-glitch/doorcontrol \
npm run deployment:configure -- staging
```

Если preflight успешен, повторите с `--apply`. Команда передаёт secrets через
stdin в GitHub CLI и не печатает их. Для production она дополнительно требует
Sentry и полный набор encrypted backup/Storage secrets. Credentials четырёх
role-smoke аккаунтов обязательны для обеих сред. Staging и production настраиваются отдельно.
Production также требует три evidence secrets: `UAT_EVIDENCE_JSON`,
`PILOT_RECONCILIATION_EVIDENCE_JSON` и `RESTORE_EVIDENCE_JSON`. Workflow до
применения миграций проверяет подписи UAT, точное совпадение SHA и счётчиков
импорта, свежесть restore drill и RTO, не печатая содержимое протоколов.

TOTP secrets создаются отдельно в каждой среде командой
`npm run auth:mfa:bootstrap`. Команда требует явного
`MFA_BOOTSTRAP_CONFIRM=STAGING|PRODUCTION`, абсолютный `MFA_BOOTSTRAP_OUTPUT`,
проверяет `aal2` и серверный write guard и записывает bundle с правами `0600`.
Файл должен находиться вне рабочей копии и после загрузки в GitHub Environment
храниться только в корпоративном password manager. Повторную проверку выполняет
`npm run auth:mfa:verify`; она не создаёт и не изменяет факторы.

Deploy workflow также запускает `npm run verify:env` и принудительно собирает
frontend с `VITE_DATA_PROVIDER=supabase`. Поэтому production-релиз не сможет
незаметно перейти на browser localStorage при ошибке конфигурации Vercel.
