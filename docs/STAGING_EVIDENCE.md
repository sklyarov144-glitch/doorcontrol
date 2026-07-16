# Подтверждения staging-релиза

Окружение: [gross-lean-montage-staging.vercel.app](https://gross-lean-montage-staging.vercel.app/).

Каждый успешный workflow `Deploy staging` создаёт неизменяемый артефакт
`staging-release-<full SHA>` со сроком хранения 90 дней. В нём зафиксированы
полный SHA, конкретные GitHub CI/staging run, Vercel deployment URL, канонический
URL, Supabase project id и результаты обязательных проверок. Именно этот JSON,
а не изменяемая строка в документации, является источником истины для UAT.

Ручной `workflow_dispatch` разрешён для диагностики, но его evidence содержит
`productionEligible: false`. Production provenance принимает только staging,
запущенный событием успешного `CI` для того же SHA.

## Автоматические проверки

- Связанный CI успешно выполняет frontend CI, чистый Supabase database reset, DB lint и pgTAP/RLS-тесты.
- Staging deployment применяет migrations, настраивает hosted Auth, разворачивает Edge Functions и frontend.
- Канонический URL отвечает `HTTP 200` и содержит meta `gross-release` с полным release SHA.
- Smoke маршрутов `/` и `/login` успешен.
- Hosted Auth проверен: публичная регистрация отключена, email login включён, redirect allowlist соответствует staging origin.
- Реальная авторизация прошла для ролей `creator`, `company_head`, `construction_director` и `itr`.
- Authenticated ITR domain smoke: 200 запросов, concurrency 20, 0 ошибок, p50 157 мс, p95 537 мс.
- Проверенная доменная выборка: `objects`, `buildings`, `floors`, `doors`, `tasks`.
- На публичном origin подтверждены CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options` и Cross-Origin-Opener-Policy.

## Ещё не подтверждено

- тестовое событие и alert contact в staging Sentry;
- межтенантный staging RLS smoke реальными Auth JWT двух компаний;
- сохранённый post-import reconciliation пилотного объекта;
- подписанный UAT руководителя и ИТР;
- production SMTP, MFA, PITR и restore drill не старше 30 дней.

Этот файл фиксирует только воспроизводимые проверки. Он не заменяет UAT evidence и production release evidence.
