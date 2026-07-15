# Подтверждения staging-релиза

Последняя подтверждённая версия: `75abf873c8592c224b352562aa2bf4402def52d1`.

Дата проверки: 15 июля 2026 года.

Окружение: [gross-lean-montage-staging.vercel.app](https://gross-lean-montage-staging.vercel.app/).

## Автоматические проверки

- [CI run 29445851796](https://github.com/sklyarov144-glitch/doorcontrol/actions/runs/29445851796) успешно выполнил frontend CI, чистый Supabase database reset, 30 migrations, DB lint и pgTAP/RLS-тесты.
- [Staging deployment run 29446031501](https://github.com/sklyarov144-glitch/doorcontrol/actions/runs/29446031501) успешно применил migrations, настроил hosted Auth, развернул Edge Functions и frontend.
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
