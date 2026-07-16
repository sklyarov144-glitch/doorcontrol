# Выпуск staging и production

## Первый запуск

1. Создать отдельные Supabase projects для staging и production.
2. Создать отдельные Vercel projects и GitHub environments `staging`,
   `production`, `production-backup`, `production-restore`.
3. Заполнить секреты из `ENVIRONMENTS.md` вручную или проверяемой командой `npm run deployment:configure -- <environment> --apply`.
4. Выполнить `npm run verify:deployment` с production-переменными.
5. Связать staging workflow с staging project, production workflow — только с production project.
6. Настроить required reviewers и запрет self-review командой
   `npm run deployment:protect-production`, затем вручную отключить admin bypass
   и подтвердить защиту `npm run deployment:audit -- production --strict`.
7. В Supabase включить MFA для владельцев, native backups/PITR и уведомления о потреблении ресурсов.

После первого staging import выполните `npm run auth:bootstrap:staging`, перенесите
те же credentials в GitHub Environment `staging` и повторно запустите deployment.
Затем подключите TOTP трём привилегированным smoke-аккаунтам командой
`MFA_BOOTSTRAP_CONFIRM=STAGING MFA_BOOTSTRAP_OUTPUT=<absolute-path> npm run auth:mfa:bootstrap`,
сохраните полученные secrets вне репозитория и проверьте их командой
`MFA_BOOTSTRAP_CONFIRM=STAGING npm run auth:mfa:verify`. Production-аккаунты и
факторы создаются отдельно; staging TOTP secrets в production не переносятся.

Edge Functions публикуются с `supabase functions deploy --use-api`: bundling
выполняется на стороне Supabase и не зависит от доступности Docker registry в
GitHub Actions.

## Staging release

До staging GitHub CI поднимает чистую локальную базу Supabase, применяет все
миграции и seed, затем выполняет database lint и pgTAP integration tests. Релиз нельзя
продолжать, если job `database` не прошёл, даже когда frontend job зелёный.

Push в `main` сначала запускает CI. Staging workflow стартует только после
успешного завершения обеих CI jobs и checkout делает по проверенному SHA. Workflow последовательно:

1. проверяет код;
2. применяет SQL migrations;
3. применяет и проверяет hosted Auth URL/signup/email configuration;
4. публикует Edge Functions;
5. проверяет health Edge Function и соединение с PostgreSQL;
6. собирает и публикует frontend;
7. выполняет smoke-test опубликованного URL;
8. входит всеми четырьмя тестовыми ролями и проверяет базовую область RLS.

Smoke выполняется по каноническому `APP_PUBLIC_URL`, потому что одноразовые Vercel
deployment URL могут быть закрыты Deployment Protection. HTML содержит meta
`gross-release`, и workflow сверяет его с `RELEASE_SHA`, поэтому публичный alias
не может незаметно отдать предыдущую версию. На обновление alias предусмотрены
ограниченные повторные попытки; внешние редиректы, включая Vercel SSO, отклоняются.
Staging использует отдельный Vercel project и публикуется в Production target
этого staging-проекта (`vercel --prod`); только так его стабильный публичный alias
атомарно переключается на проверяемый release. Настоящий production использует
другой Vercel project и другой GitHub Environment.

Пока secrets среды или четыре role-smoke аккаунта не настроены, staging workflow
завершается ошибкой и не выдаёт отсутствие деплоя за успешный release. После
заполнения Supabase/Vercel secrets дополнительное изменение workflow не требуется.

Перед production проверяются вход каждой роли, RLS, создание/редактирование объекта, маршрут до двери, задачи, уведомления, документы и отчёты.

## Production release

1. Убедиться, что staging acceptance checklist пройден, а подписанный JSON из `UAT_CHECKLIST.md` сохранён в production secret `UAT_EVIDENCE_JSON`.
2. Сохранить успешную post-import сверку того же SHA в
   `PILOT_RECONCILIATION_EVIDENCE_JSON`, а evidence restore drill не старше 30
   дней — в `RESTORE_EVIDENCE_JSON`. Production workflow объединённо проверяет
   эти три протокола командой `npm run pilot:production-readiness`.
3. Подключить отдельные production TOTP-факторы командой `auth:mfa:bootstrap`, загрузить три secrets в GitHub Environment `production` и выполнить `MFA_BOOTSTRAP_CONFIRM=PRODUCTION npm run auth:mfa:verify`.
4. Проверить свежий backup и окно восстановления.
5. Взять полный 40-символьный SHA из успешного `Deploy staging`, запустить `Deploy production`, указать этот SHA и ввести `DEPLOY`.
6. Approver подтверждает GitHub environment.
7. После smoke-test вручную проверить вход и основной ИТР-маршрут.
8. Скачать и сохранить artifact `production-release-<SHA>`: он содержит SHA, staging run, Supabase project, deployment URL, канонический домен, время, исполнителя и результаты обязательных smoke-проверок. Workflow отклонит SHA, для которого нет успешного staging deployment из ветки `main`.

SQL migrations должны быть backward-compatible: сначала расширение схемы, затем код, удаление старых колонок — отдельным будущим релизом после проверки использования.

## Домен

1. Добавить домен в Vercel и установить предложенные DNS записи.
2. Дождаться HTTPS certificate.
3. Обновить `APP_PUBLIC_URL`/`APP_ALLOWED_ORIGINS`; deployment автоматически применит и проверит Supabase Auth Site URL и redirect allowlist.
4. Обновить `VITE_APP_URL`, CSP при появлении новых доверенных сервисов и Sentry allowed domains.
5. Запустить `SMOKE_URL=https://domain.example npm run smoke`.

## Откат

Frontend откатывается promotion предыдущего успешного Vercel deployment. База не откатывается удалением migration: выпускается forward-fix migration. Восстановление всей БД выполняется только по runbook и с подтверждением владельца данных.
