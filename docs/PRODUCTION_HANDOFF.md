# Production handoff

Production handoff — обязательный операционный протокол конкретного релиза. Он
не заменяет UAT, сверку импорта или restore drill: документ связывает эти
технические evidence с владельцами решения, production-доменом и согласованным
окном выпуска.

## Подготовка

1. Скопировать `pilot/production-handoff.template.json` в игнорируемый файл
   `pilot/production-handoff.json`.
2. Указать полный SHA успешного staging-релиза и точный `APP_PUBLIC_URL`.
3. Перенести `sourceSha256` и четыре `expectedCounts` из успешного
   reconciliation evidence без ручного пересчёта.
4. Назначить владельца бизнеса, технического владельца, владельца данных,
   поддержку и независимого release reviewer. GitHub login reviewer должен
   отличаться от login технического владельца.
5. После завершения UAT, reconciliation и restore drill получить подтверждения
   трёх владельцев. Подпись, поставленная раньше последнего evidence, отклоняется.
6. Указать окно выпуска не длиннее восьми часов. Production workflow запускается
   только внутри этого окна.
7. Подтвердить ознакомление с runbook и rollback plan.

Фактический JSON содержит контактные данные и не коммитится. Он хранится в
защищённом корпоративном хранилище и целиком загружается в GitHub Environment
`production` как secret `PRODUCTION_HANDOFF_JSON`.

## Проверка до загрузки

Проверка использует те же четыре evidence-файла, что production workflow:

```bash
EXPECTED_RELEASE_SHA=<full-staging-sha> \
EXPECTED_PRODUCTION_URL=https://app.example.ru \
EXPECTED_GITHUB_REPOSITORY=sklyarov144-glitch/doorcontrol \
UAT_EVIDENCE_PATH=/absolute/path/uat-evidence.json \
PILOT_RECONCILIATION_EVIDENCE_PATH=/absolute/path/reconciliation-evidence.json \
RESTORE_EVIDENCE_PATH=/absolute/path/restore-evidence.json \
PRODUCTION_HANDOFF_PATH=/absolute/path/production-handoff.json \
npm run pilot:production-readiness
```

Команда блокирует релиз при несовпадении SHA, домена, репозитория, hash/счётчиков
импорта, неполных владельцах, self-review, неподписанном handoff, непризнанном
runbook/rollback plan или запуске вне согласованного окна.

## Изменение релиза

Handoff нельзя переносить на другой SHA. После нового staging-релиза или
изменения import payload создаётся новый документ и повторяются подтверждения.
Изменение только времени окна также требует обновить secret до запуска workflow.
