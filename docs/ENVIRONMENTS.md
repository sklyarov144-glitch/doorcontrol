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

Это технические пользователи без персональных данных. Production-аккаунты должны
быть назначены только на отдельный контрольный объект. Если набор неполный,
workflow завершается ошибкой и не выдаёт отсутствие Auth smoke за успешную проверку.

Только для `production` backup:

- `SUPABASE_DB_URL` — direct database connection string;
- `BACKUP_ENCRYPTION_PASSWORD` — отдельный длинный секрет, хранимый также в корпоративном password manager.
- `BACKUP_SUPABASE_URL` — URL production Supabase для выгрузки Storage;
- `BACKUP_SUPABASE_SERVICE_ROLE_KEY` — service role только для backup/restore workflow.
- `UAT_EVIDENCE_JSON` — полный подписанный UAT JSON для конкретного staging SHA.

Production environment должен требовать ручного approve владельцем продукта или техническим ответственным.

## Supabase Auth URLs

В Authentication → URL Configuration:

- Site URL: production-домен;
- Redirect URLs: production-домен, staging-домен и только необходимые callback URL;
- localhost разрешается только в локальном Supabase project.

Перед выпуском выполните `npm run verify:deployment`. Скрипт проверяет HTTPS,
совпадение `APP_PUBLIC_URL` с allowlist, соответствие `VITE_SUPABASE_URL`
конкретному `SUPABASE_PROJECT_ID` и наличие всех deployment credentials,
не печатая значения секретов.

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
Production также требует `UAT_EVIDENCE_JSON`; workflow сверяет его `releaseSha`
с выпускаемым SHA до применения миграций и не печатает содержимое протокола.

Deploy workflow также запускает `npm run verify:env` и принудительно собирает
frontend с `VITE_DATA_PROVIDER=supabase`. Поэтому production-релиз не сможет
незаметно перейти на browser localStorage при ошибке конфигурации Vercel.
