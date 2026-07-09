# Деплой MVP "ГРОСС Бережливый Монтаж"

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение открывается по адресу `http://localhost:5173/`.

## Демо-пользователи

Все демо-пользователи используют пароль `123456`.

| Роль | Email |
| --- | --- |
| Создатель сайта | `creator@gross.ru` |
| Руководитель компании | `head@gross.ru` |
| Директор строительства | `director@gross.ru` |
| ИТР Матвеевский парк | `itr.matveevsky@gross.ru` |
| ИТР Прокшино | `itr.prokshino@gross.ru` |

## Сборка

```bash
npm run build
```

Результат сборки находится в папке `dist`.

## Vercel

1. Импортировать GitHub-репозиторий в Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Переменные окружения пока не обязательны, потому что MVP работает на `localStorage`.

## Будущее подключение Supabase

Планируемые переменные окружения:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` нельзя использовать во фронтенде. Он нужен только для будущего серверного слоя, edge functions или админских операций.

Граница доступа к данным уже вынесена в `src/services/dataProvider`. Сейчас используется `localProvider`, позже его можно заменить на `supabaseProvider` без полной переработки экранов.

