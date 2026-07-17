# Архитектура приложения

Frontend подготовлен к поэтапной замене локального хранилища на production backend без остановки работы MVP.

## Слои

```text
src/frontend/
  app/          запуск приложения, маршруты и переходный compatibility-контур
  components/   общие UI-компоненты и ErrorBoundary
  contexts/     контексты приложения, включая AuthContext
  domain/       бизнес-правила и разрешения
  hooks/        переиспользуемые React hooks
  mocks/        демонстрационные данные
  pages/        публичные точки входа страниц
  utils/        общие утилиты

src/services/
  dataProvider/ единая граница доступа к данным
```

`app/AppRoot.jsx` содержит текущий orchestration-слой и app shell; страницы вынесены в `pages`, а общие блоки — в `components`. `app/LegacyApp.jsx` сохранён только как тонкий compatibility re-export для внешних импортов и не является точкой входа приложения. Следующий шаг декомпозиции — вынести оставшийся shell/router из `AppRoot.jsx` в самостоятельные компоненты.

## Маршрутизация

Приложение использует React Router и поддерживает прямое открытие URL:

- `/login`
- `/objects`
- `/objects/:objectId`
- `/objects/:objectId/buildings/:buildingId`
- `/objects/:objectId/buildings/:buildingId/floors/:floorId`
- `/objects/:objectId/buildings/:buildingId/floors/:floorId/doors/:doorId`
- `/dashboard`, `/tasks`, `/notifications`, `/problems`
- `/custody-acts`, `/documents`, `/brigades`, `/manpower`
- `/users`, `/profile`, `/admin`, `/reports`

Vercel rewrite направляет прямые запросы на `index.html`, после чего маршрут восстанавливается на клиенте.

## Обработка ошибок

Корневой `ErrorBoundary` не допускает белого экрана при необработанной ошибке. На production-этапе `componentDidCatch` следует подключить к сервису мониторинга.

## Следующий этап

1. Создать Supabase provider с тем же контрактом.
2. Вынести Supabase-конфигурацию в переменные окружения.
3. Перенести сначала пользователей и объекты, затем рабочие сущности.
4. Оставить local provider только для demo-режима.
