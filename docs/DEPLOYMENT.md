# Выпуск staging и production

## Первый запуск

1. Создать отдельные Supabase projects для staging и production.
2. Создать отдельные Vercel projects и GitHub environments.
3. Заполнить секреты из `ENVIRONMENTS.md`.
4. Выполнить `npm run verify:deployment` с production-переменными.
5. Связать staging workflow с staging project, production workflow — только с production project.
6. Включить required reviewers для GitHub environment `production`.
7. В Supabase включить MFA для владельцев, native backups/PITR и уведомления о потреблении ресурсов.

После первого staging import выполните `npm run auth:bootstrap:staging`, перенесите
те же credentials в GitHub Environment `staging` и повторно запустите deployment.

## Staging release

До staging GitHub CI поднимает чистую локальную базу Supabase, применяет все
миграции и seed, затем выполняет database lint и pgTAP integration tests. Релиз нельзя
продолжать, если job `database` не прошёл, даже когда frontend job зелёный.

Push в `main` сначала запускает CI. Staging workflow стартует только после
успешного завершения обеих CI jobs и checkout делает по проверенному SHA. Workflow последовательно:

1. проверяет код;
2. применяет SQL migrations;
3. публикует Edge Functions;
4. проверяет health Edge Function и соединение с PostgreSQL;
5. собирает и публикует frontend;
6. выполняет smoke-test опубликованного URL;
7. входит всеми четырьмя тестовыми ролями и проверяет базовую область RLS.

Пока secrets среды или четыре role-smoke аккаунта не настроены, staging workflow
завершается ошибкой и не выдаёт отсутствие деплоя за успешный release. После
заполнения Supabase/Vercel secrets дополнительное изменение workflow не требуется.

Перед production проверяются вход каждой роли, RLS, создание/редактирование объекта, маршрут до двери, задачи, уведомления, документы и отчёты.

## Production release

1. Убедиться, что staging acceptance checklist пройден.
2. Проверить свежий backup и окно восстановления.
3. Взять полный 40-символьный SHA из успешного `Deploy staging`, запустить `Deploy production`, указать этот SHA и ввести `DEPLOY`.
4. Approver подтверждает GitHub environment.
5. После smoke-test вручную проверить вход и основной ИТР-маршрут.
6. Зафиксировать SHA, время выпуска и ответственного в журнале релизов. Workflow отклонит SHA, для которого нет успешного staging deployment из ветки `main`.

SQL migrations должны быть backward-compatible: сначала расширение схемы, затем код, удаление старых колонок — отдельным будущим релизом после проверки использования.

## Домен

1. Добавить домен в Vercel и установить предложенные DNS записи.
2. Дождаться HTTPS certificate.
3. Обновить Supabase Auth Site URL и redirect allowlist.
4. Обновить `VITE_APP_URL`, CSP при появлении новых доверенных сервисов и Sentry allowed domains.
5. Запустить `SMOKE_URL=https://domain.example npm run smoke`.

## Откат

Frontend откатывается promotion предыдущего успешного Vercel deployment. База не откатывается удалением migration: выпускается forward-fix migration. Восстановление всей БД выполняется только по runbook и с подтверждением владельца данных.
