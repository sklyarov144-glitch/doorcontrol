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

Только для `production` backup:

- `SUPABASE_DB_URL` — direct database connection string;
- `BACKUP_ENCRYPTION_PASSWORD` — отдельный длинный секрет, хранимый также в корпоративном password manager.

Production environment должен требовать ручного approve владельцем продукта или техническим ответственным.

## Supabase Auth URLs

В Authentication → URL Configuration:

- Site URL: production-домен;
- Redirect URLs: production-домен, staging-домен и только необходимые callback URL;
- localhost разрешается только в локальном Supabase project.
