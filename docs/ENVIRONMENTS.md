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

Используются четыре изолированных GitHub Environment:

- `staging` — staging deployment и smoke;
- `production` — только production deployment;
- `production-backup` — только автоматический read/export backup;
- `production-restore` — только ручной restore drill.

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

Только в `production-backup`:

- `SUPABASE_DB_URL` — direct database connection string;
- `BACKUP_ENCRYPTION_PASSWORD` — отдельный длинный секрет, хранимый также в корпоративном password manager.
- `BACKUP_SUPABASE_URL` — URL production Supabase для выгрузки Storage;
- `BACKUP_SUPABASE_SERVICE_ROLE_KEY` — service role только для backup workflow.

Только в `production-restore`:

- `BACKUP_ENCRYPTION_PASSWORD` — тот же пароль расшифровки, но отдельная копия
  секрета; restore workflow не получает строку production БД или service role.

Только в `production`:

- `UAT_EVIDENCE_JSON` — полный подписанный UAT JSON для конкретного staging SHA.
- `PILOT_RECONCILIATION_EVIDENCE_JSON` — результат точной post-import сверки
  пилотной иерархии для выпускаемого staging SHA.
- `RESTORE_EVIDENCE_JSON` — evidence последнего успешного restore drill; на момент
  выпуска он должен быть не старше 30 дней, а восстановление укладываться в RTO 4 часа.
- `PRODUCTION_HANDOFF_JSON` — подписанный операционный handoff для конкретного
  release SHA, production-домена, hash импорта и согласованного окна выпуска.

`production-backup` не должен иметь required reviewer: иначе scheduled workflow
будет ждать ручного подтверждения и RPO перестанет выполняться. Его workflow
получает минимальный набор секретов, а custom deployment branch policy должна
разрешать ровно одну ветку `main`. Аудит отклоняет дополнительные шаблоны веток.
`production-restore`, напротив, требует reviewer, запрет self-review и отключённый
admin bypass, поскольку восстановление запускается вручную.

Production environment должен требовать ручного approve владельцем продукта или техническим ответственным.
Инициатор production deployment не должен иметь возможность одобрить собственный
запуск, а обход protection rules администратором должен быть отключён.

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
собран полностью. Для production также проверяются required reviewer, запрет
self-review и отключённый admin bypass; наличие одних только secrets больше не считается
готовой release-защитой. Отдельное предупреждение сообщает об отсутствии Sentry
в staging, где DSN пока не является блокирующим deployment secret.

Required reviewers и запрет self-review можно настроить поддерживаемым GitHub REST
API, не передавая секреты. ID пользователя узнаётся через `gh api users/<login>
--jq .id`, ID команды — через `gh api orgs/<org>/teams/<slug> --jq .id`. Reviewer
выбирается владельцем бизнеса явно; скрипт не назначает текущего пользователя
автоматически:

```bash
PRODUCTION_REVIEWERS=User:123456 \
npm run deployment:protect-production

PRODUCTION_REVIEWERS=User:123456 \
PRODUCTION_PROTECTION_CONFIRM=PRODUCTION:sklyarov144-glitch/doorcontrol:User:123456 \
npm run deployment:protect-production -- --apply
```

Можно указать до шести reviewer через запятую, например
`User:123456,Team:98765`. Команда сохраняет текущие wait timer и branch policy,
включает `prevent_self_review`, повторно читает настройки и проверяет результат.
GitHub REST API не предоставляет документированного параметра для отключения
admin bypass. После команды владелец репозитория отключает **Allow administrators
to bypass configured protection rules** в настройках целевого environment.
Готовность подтверждается только строгим аудитом:

```bash
npm run deployment:audit -- production --strict
```

Для защищённого restore-контура используется тот же CLI с явным target:

```bash
PROTECTED_ENVIRONMENT=production-restore \
PRODUCTION_REVIEWERS=User:123456 \
npm run deployment:protect-production

PROTECTED_ENVIRONMENT=production-restore \
PRODUCTION_REVIEWERS=User:123456 \
PRODUCTION_PROTECTION_CONFIRM=PRODUCTION-RESTORE:sklyarov144-glitch/doorcontrol:User:123456 \
npm run deployment:protect-production -- --apply
```

## Безопасная загрузка GitHub Environment

После входа командой `gh auth login` экспортируйте значения в текущем терминале и
сначала выполните dry-run:

```bash
GITHUB_REPOSITORY=sklyarov144-glitch/doorcontrol \
npm run deployment:configure -- staging
```

Если preflight успешен, повторите с `--apply`. Команда передаёт secrets через
stdin в GitHub CLI и не печатает их. Credentials четырёх role-smoke аккаунтов
обязательны для deployment-сред. Все четыре environments настраиваются отдельно;
backup/restore credentials не дублируются в `production`.
Production также требует четыре evidence secrets: `UAT_EVIDENCE_JSON`,
`PILOT_RECONCILIATION_EVIDENCE_JSON`, `RESTORE_EVIDENCE_JSON` и
`PRODUCTION_HANDOFF_JSON`. Workflow до
применения миграций проверяет подписи UAT, точное совпадение SHA и счётчиков
импорта, свежесть restore drill и RTO, владельцев, домен и окно выпуска, не
печатая содержимое протоколов. Формат handoff описан в
[`PRODUCTION_HANDOFF.md`](PRODUCTION_HANDOFF.md).

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
