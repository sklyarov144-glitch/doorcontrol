# Подтверждения staging-релиза

Статус: **не подтверждено**.

На текущем состоянии репозитория нет успешного полного `Deploy staging` с
frontend smoke и immutable release evidence. Последний запуск остановился до
изменения инфраструктуры: Vercel отклонил `VERCEL_TOKEN`; после усиления gate
также требуется `VITE_SENTRY_DSN`.

Канонический URL сейчас отвечает `HTTP 200`, но отдаёт release SHA
`d9469ba77372db21683d4677d7ea2ec13129793f` от 17 июля, тогда как актуальный
`main` — `51fba03502248eeb052934730f6e1c4bb927e1ac`. Этот старый deployment не
является evidence текущего релиза и не используется для UAT или production
provenance.

Окружение: [gross-lean-montage-staging.vercel.app](https://gross-lean-montage-staging.vercel.app/).

Каждый успешный workflow `Deploy staging` создаёт неизменяемый артефакт
`staging-release-<full SHA>` со сроком хранения 90 дней. В нём зафиксированы
полный SHA, конкретные GitHub CI/staging run, Vercel deployment URL, канонический
URL, Supabase project id и результаты обязательных проверок. Именно этот JSON,
а не изменяемая строка в документации, является источником истины для UAT.

Ручной `workflow_dispatch` разрешён для диагностики, но его evidence содержит
`productionEligible: false`. То же относится к релизу без принятого Sentry smoke.
Production provenance принимает только staging, запущенный событием успешного
`CI` для того же SHA, скачивает его artifact и повторно проверяет содержимое.

## Что проверяет pipeline после настройки секретов

- Связанный CI успешно выполняет frontend CI, чистый Supabase database reset, DB lint и pgTAP/RLS-тесты.
- Staging deployment применяет migrations, настраивает hosted Auth, разворачивает Edge Functions и frontend.
- Канонический URL отвечает `HTTP 200` и содержит meta `gross-release` с полным release SHA.
- Smoke маршрутов `/` и `/login` успешен.
- Hosted Auth проверен: публичная регистрация отключена, email login включён, redirect allowlist соответствует staging origin.
- Реальная авторизация прошла для ролей `creator`, `company_head`, `construction_director` и `itr`.
- Authenticated ITR domain smoke: 200 запросов, concurrency 20, 0 ошибок и
  p95 не более 2,5 секунд.
- Проверенная доменная выборка: `objects`, `buildings`, `floors`, `doors`, `tasks`.
- На публичном origin подтверждены CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options` и Cross-Origin-Opener-Policy.

## Ещё не подтверждено

- успешный staging deployment, frontend smoke и immutable release evidence;
- тестовое событие и alert contact в staging Sentry;
- межтенантный staging RLS smoke реальными Auth JWT двух компаний;
- сохранённый post-import reconciliation пилотного объекта;
- подписанный UAT руководителя и ИТР;
- production SMTP, MFA, PITR и restore drill не старше 30 дней.

Этот файл фиксирует только воспроизводимые проверки. Он не заменяет UAT evidence и production release evidence.
