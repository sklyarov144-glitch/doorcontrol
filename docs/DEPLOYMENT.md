# Выпуск staging и production

## Первый запуск

1. Создать отдельные Supabase projects для staging и production.
2. Создать отдельные Vercel projects и GitHub environments.
3. Заполнить секреты из `ENVIRONMENTS.md`.
4. Связать staging workflow с staging project, production workflow — только с production project.
5. Включить required reviewers для GitHub environment `production`.
6. В Supabase включить MFA для владельцев, native backups/PITR и уведомления о потреблении ресурсов.

## Staging release

До staging GitHub CI поднимает чистую локальную базу Supabase, применяет все
миграции и seed, затем выполняет `supabase db lint --level error --fail-on error`. Релиз нельзя
продолжать, если job `database` не прошёл, даже когда frontend job зелёный.

Push в `main` запускает CI и staging deployment. Workflow последовательно:

1. проверяет код;
2. применяет SQL migrations;
3. публикует Edge Functions;
4. собирает и публикует frontend;
5. выполняет smoke-test опубликованного URL.

Пока secrets среды не настроены, workflow завершает проверки кода успешно и помечает сам деплой как пропущенный. После заполнения всех Supabase/Vercel secrets дополнительное изменение workflow не требуется.

Перед production проверяются вход каждой роли, RLS, создание/редактирование объекта, маршрут до двери, задачи, уведомления, документы и отчёты.

## Production release

1. Убедиться, что staging acceptance checklist пройден.
2. Проверить свежий backup и окно восстановления.
3. Запустить `Deploy production` вручную и ввести `DEPLOY`.
4. Approver подтверждает GitHub environment.
5. После smoke-test вручную проверить вход и основной ИТР-маршрут.
6. Зафиксировать SHA, время выпуска и ответственного в журнале релизов.

SQL migrations должны быть backward-compatible: сначала расширение схемы, затем код, удаление старых колонок — отдельным будущим релизом после проверки использования.

## Домен

1. Добавить домен в Vercel и установить предложенные DNS записи.
2. Дождаться HTTPS certificate.
3. Обновить Supabase Auth Site URL и redirect allowlist.
4. Обновить `VITE_APP_URL`, CSP при появлении новых доверенных сервисов и Sentry allowed domains.
5. Запустить `SMOKE_URL=https://domain.example npm run smoke`.

## Откат

Frontend откатывается promotion предыдущего успешного Vercel deployment. База не откатывается удалением migration: выпускается forward-fix migration. Восстановление всей БД выполняется только по runbook и с подтверждением владельца данных.
