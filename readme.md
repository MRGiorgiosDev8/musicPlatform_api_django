![GitHub last commit](https://img.shields.io/github/last-commit/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Repository size](https://img.shields.io/github/repo-size/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-%23e0115f)
![License](https://img.shields.io/github/license/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Tests](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/tests.yml?label=tests&logo=github&color=%23e0115f)
![Deploy](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/main.yml?label=deploy&logo=github&color=%23e0115f)

# 🎵 RubySound.fm
**RubySound.fm** — полнофункциональный музыкальный агрегатор с асинхронной архитектурой на Django + DRF, объединяющий данные из Last.fm, Deezer и iTunes.

Проект построен на **ASGI-архитектуре**, поддерживает высокую нагрузку за счет параллельных запросов и включает глубокую систему взаимодействия с пользователем.

### 🌟 Основные возможности:
- 🔍 **Умный асинхронный поиск**: Мгновенный сбор данных из трех внешних источников одновременно (batch-запросы).
- 📈 **Интерактивные чарты**: Динамические списки популярных артистов/трэков с фильтрацией по жанрам.
- 🎧 **Мультимедиа**: Прослушивание превью треков и бесшовная подгрузка метаданных.
- ❤️ **Личная библиотека**: Создание персональных плейлистов (Favorites), управление списком избранного и **умная фильтрация** (поиск по старым/новым релизам или конкретным артистам внутри ваших подборок).
- 🌍 **Публичные плейлисты**: Страница пользователя с публичным плейлистом и мини-статистикой.
- 👍 **Социальные механики**: Лайки публичных плейлистов, рейтинг на dashboard, комментарии к публичным плейлистам и уведомления о новых лайках.
- 🟢 **Presence (Online Status)**: realtime-статус пользователя на публичной странице (онлайн/оффлайн) с live-обновлением через WebSocket.
- 💬 **Realtime комментарии**: Форма комментариев, удаление по правам (автор/владелец) и live-синхронизация списка комментариев через WebSocket без перезагрузки.
- 📚 **Wikipedia API + Artist Bio Modal**: При клике на имя артиста открывается модальное окно с биографией артиста (RU/EN fallback), фото из Wikipedia и анимациями на GSAP.
- 📱 **Mobile First**: Интерфейс полностью адаптирован для использования на смартфонах.
- 🔐 **Безопасность**: Регистрация и аутентификация пользователей на базе JWT-токенов.
- ⚡ **Высокая производительность**: Оптимизация запросов и кэширование данных через Redis.
- 🔄 **CI/CD**: Автоматизированное тестирование и деплой через GitHub Actions, контейнеризация проекта с Docker

---
* **Live Demo:** 🌍 [georgios8-rubysoundfm.onrender.com](https://georgios8-rubysoundfm.onrender.com)
---

## 📑 Оглавление
- [⚡ Быстрый запуск](#quick-start)
- [🐍 Стек](#stack)
- [🎨 Фронтенд](#frontend)
- [🐳 Docker](#docker)
- [🧪 Тестирование](#testing)
- [🚀 Деплой и CI/CD](#deploy)
- [📖 API Documentation](#api-docs)
- [🛠️ Технические решения](#tech)
- [История изменений](#changelog)
- [🚀 Запуск проекта](#run)


## 🐍 Стек <a id="stack"></a>

- **Python 3.12**
- **Django**
- **Django REST Framework** + **JWT**
- **Redis** (Кэш и сессии)
- **PostgreSQL** (Основная БД)
- **Pytest** (Тесты)
- **Vitest** (Unit-тесты фронтенда)
- **WebSocket (Django Channels)** (realtime-обновления)
- **Docker & Docker Compose**
- **GitHub Actions** (настроенный CI/CD-пайплайн)
- **Uvicorn(ASGI)**
- **httpx (async)** 
- **WhiteNoise**, **django-compressor**
- **Swagger UI (Автодокументация API)**

---

### 🎨 Фронтенд <a id="frontend"></a>

- **Bootstrap 5** — сетка и адаптивные компоненты
- **Font Awesome** — иконки
- **GSAP** — анимации и визуальные эффекты
- **Собственные скрипты фронтенда**:
  - `js/features/*.js` — функциональные модули (трендовые артисты, чарты, поиск)
  - `js/UI/*.js` — UI-модули (scroll, кнопки, поиск)
  - `js/animation/*.js` — анимации и визуальные эффекты
  - `js/utils/utils.js` — утилиты

---
### 🐳 Docker <a id="docker"></a>

- **Контейнеризация проекта** для удобной локальной разработки и деплоя
- Используется **Docker Compose** для сборки и запуска всех сервисов
- Позволяет избежать проблем с зависимостями и конфигурацией окружения
- Поддерживает асинхронную архитектуру проекта без изменений

---

## 🧪 Тестирование <a id="testing"></a>

Проект использует два уровня тестирования:
- `pytest` для API, моделей и backend-бизнес-логики.
- `vitest` для unit-тестов frontend-модулей (`static/js`).

### Инструментарий
* **pytest-asyncio** — поддержка асинхронных тестов.
* **respx** — мокирование внешних API (iTunes/Last.fm).
* **pytest-cov** — отчеты о покрытии кода.
* **Vitest + jsdom** — unit-тесты frontend-логики и DOM-сценариев.

### Frontend Unit Tests (Vitest)
- Покрыты ключевые модули: `favorite-button`, `music_search`, `playlists`, `public-playlist`, `artist_wikipedia_modal`, `year2025`, `trending`.
- Проверяются: фильтрация/сортировка/пагинация, кэш/TTL, batch-запросы, обработка ошибок API, состояние UI-кнопок.
- Текущий статус: **39 passed** (`tests/js`, 7 test files).

### Команды запуска

| Окружение | Команда | Среднее время |
| :--- | :--- |:--------------|
| **Docker** (рекомендуется) | `make test` | ~6.30s ⚡️     |
| **Локально** (macOS) | `make test-local` | ~10.01s       |
| **Frontend Unit** | `npx vitest run` | ~1-2s ⚡️ |

> При локальном запуске убедитесь, что Postgres и Redis запущены через `brew services`.

---

## 🚀 Деплой и CI/CD <a id="deploy"></a>

Проект использует современный стек для автоматизации разработки и развертывания.

* **Live Demo:** [georgios8-rubysoundfm.onrender.com](https://georgios8-rubysoundfm.onrender.com)

### **Архитектура в Production**
В связи с бесплатным тарифом **Render**, конфигурация окружения оптимизирована следующим образом:

* **База данных:** Используется  **PostgreSQL** для надежного хранения данных пользователей и плейлистов.
* **Кэширование:** Вместо Redis (который является платным дополнением на Render) в продакшене активирован **LocMemCache** (внутренняя память Django).
* **Локация:** Сервер расположен во **Франкфурте**.
> **Важно (Render Storage):** Для деплоя используется Render с эфемерной файловой системой (Ephemeral File System). При перезапуске контейнера или новом деплое локальное хранилище очищается, поэтому пользовательские медиа-файлы (например, аватарки) не сохраняются на диске сервера.
> **Примечание:** Скорость отклика API на Demo-сервере (**Render Free**) может быть ограничена ресурсами бесплатного хостинга и сетевой задержкой **<1100ms**.. В локальной среде (**Docker**) среднее время отклика составляет **<300ms**.

---

### **Автоматизация (CI/CD)**
Процесс обновления проекта полностью автономен:

1.  **Тестирование:** При каждом *push* GitHub Actions автоматически запускает проверку кода (`tests.yml`).
2.  **Сборка:** После успешного прохождения тестов собирается актуальный Docker-образ и отправляется на Docker Hub (`main.yml`).
3.  **Авто-деплой:** Render мгновенно подхватывает изменения и пересобирает проект «на лету» без участия разработчика.
4.  **Linting**: Контроль качества кода с помощью `Black` и `Flake8`.

---
### 📖 API Documentation(Swagger UI) <a id="api-docs"></a>

Проект предоставляет интерактивную документацию в формате **OpenAPI 3.0**, доступную сразу после запуска контейнеров через Docker/Uvicorn:

* **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) — для тестирования запросов в реальном времени.
* **Redoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/) — для удобного чтения спецификации.

### 🔑 Как авторизоваться в Swagger:

1.  Выполните запрос `POST /api/auth/token/`, передав свой **username** и **password**.
2.  Скопируйте значение `access` из тела ответа.
3.  Нажмите кнопку **Authorize** (иконка замка) в верхней части страницы Swagger.
4.  Вставьте токен в поле **Value** для `jwtAuth` и нажмите **Authorize**.

---

## 🛠️Технические решения <a id="tech"></a>

### ✅ Асинхронная архитектура
- **ASGI** + **Uvicorn** (не WSGI/runserver)
- **httpx.AsyncClient** с ограничениями и таймаутами
- **asyncio.gather** для параллельных batch-запросов к Last.fm/Deezer/iTunes
- **Глобальный AsyncClient** (`httpx.AsyncClient`) вынесен в AppConfig
  - Автоматическое закрытие при shutdown через `atexit.register()`
  - Обеспечивает корректное управление соединениями и предотвращает утечки
  - Обрабатывает сценарии с уже запущенным или отсутствующим event loop
- **Модульная структура views**:
  - Проект перешел на модульную инфраструктуру
  - Основные модули:
    - `artists_async.py` — API артистов, тренды, жанры
    - `tracks_async.py` — чарты и поиск треков
    - `services_async.py` — асинхронные сервисные функции для внешних API (Deezer, iTunes, Last.fm)
    - `pages.py` — страницы и рендеринг фронтенда
    - `base.py` — общие константы и вспомогательные функции
  - Это позволяет поддерживать проект, улучшает читаемость и расширяемость
- **Семафоры** для контроля одновременных запросов:
  - Last.fm: `Semaphore(5)`
  - Deezer: `Semaphore(15)`
  - iTunes: `Semaphore(3)`

### ✅ Batch-запросы и кэширование
- **Параллельные батчи** до 40 треков (Deezer) / 25 (iTunes) / 75 (Last.fm)
- **Кэш** Django + localStorage на клиенте (10 минут TTL)
- **Умное обогащение**: сначала Last.fm, потом параллельно Deezer + iTunes

### ✅ Безопасный фронтенд
- **Никакого `innerHTML`** — только **DOM API** (`createElement`, `textContent`, `appendChild`, `replaceChildren`)
- **Фрагменты** (`DocumentFragment`) для производительного рендера
- **Экранирование** при вставке данных
- **Ленивая загрузка** изображений (`loading="lazy"`)

### ✅ Производительность
- **WhiteNoise** + **django-compressor** для статики
- **Throttling** DRF
- **Пагинация** до 30 элементов на страницу
- **Анимации** через GSAP

---

### История изменений <a id="changelog"></a>

#### 2026-02-05 

- **fix**: Параллельная обработка треков в `_get_lastfm_tracks_by_genre_async` вместо последовательного цикла
- **feat**: Кеширование результатов `track.getInfo` в Django (`LocMemCache`)
  - успешные ответы — 7 дней
  - ошибки — 10 минут
- **perf**: Значительное ускорение загрузки жанров в Year Chart
  - Первый запрос: ~2.5 секунды
  - Повторный запрос: ~0.8 секунды
- **изменённые файлы**: 
  - `music_api/views/services_async.py`
  - `music_project/settings.py`
- **Рекомендации для будущего**:
  - Использовать Redis для персистентного кеша
- **Опициональные  улучшение:**
  - Использовать mbid для стабильных ключей кеша
  - Кеширование целых жанровых батчей
---

#### 2026-02-11

- **feat**: Подключен Redis + Hiredis для кеша Django
  - `cache.set()` и `cache.get()` работают через Redis
  - ZlibCompressor для сжатия кеша
  - Ускорение операций при массовых запросах

---

#### 2026-02-12
- refactor: Разделён settings.py на модульную структуру окружений
- **Создан пакет settings/ с файлами:**
  - base.py — общие настройки проекта
  - dev.py — настройки для локальной разработки
  - prod.py — настройки для Docker
- Пеключение окружений реализовано через DJANGO_SETTINGS_MODULE и переменную USE_DOCKER
- Улучшена масштабируемость и читаемость конфигурации проекта
- **feat**: Полный переход на **PostgreSQL 16** в качестве основной базы данных.
- **feat**: Интеграция приложения `users` — реализована кастомная модель пользователя (`AbstractUser`).
- **feat**: Настроена **JWT-аутентификация** для безопасного доступа к API.
- **refactor**: Универсальная конфигурация окружения в `base.py`.
  - Проект теперь автоматически определяет среду (Docker vs Local) и переключает хосты БД/Redis.
  - 
- **feat**: Внедрена система **асинхронного тестирования (pytest)**:
  - Написаны тесты для асинхронных сервисов (`test_services_async.py`), публичного API и системы плейлистов.
  - Реализована полная изоляция через `respx` (моки внешних API) и автоматическая очистка Redis.
  - Подтверждена стабильность работы **Event Loop** и асинхронных соединений `httpx`.
- **infra**: Обеспечена 100% совместимость тестов как в Docker-контейнерах, так и в локальной среде (macOS + Homebrew).
- **Статус**: 8 тестов успешно пройдены (8 passed).
  - Скорость выполнения в Docker: **6.20s** ⚡️
  - Скорость выполнения локально: **9.69s**
- **CI**: Настроена автоматическая проверка кода через GitHub Actions (тесты запускаются при каждом пуше).

---

#### 2026-02-14 — Комплексное тестирование безопасности и логики моделей
- **Покрытие тестами:** Общее количество тестов доведено до 31 (использование `pytest-django` и `pytest-asyncio`).
- **Безопасность (Security Audit):**
  - Реализованы тесты на защиту от CSRF (валидация `Referer` и `X-CSRFToken`).
  - Добавлены проверки на устойчивость к SQL-инъекциям в эндпоинтах авторизации.
  - Проверка защиты от XSS-нагрузок в полях профиля пользователя.
- **Модели и БД (Model Integrity):**
  - Подтверждена работа Django Signals: автоматическое создание плейлиста "Favorites" при регистрации.
  - Тестирование `JSONField`: валидация структуры данных треков и защита от несериализуемых объектов.
  - Проверка каскадного удаления (`CASCADE`) и корректности связей через `related_name`.
- **Профили и Медиа:**
  - Тестирование загрузки аватаров (`multipart/form-data`) с использованием генерации изображений через Pillow.
  - Проверка ограничений на редактирование `Read-Only` полей (email, username) через эндпоинт `/me/`.

  #### 2026-02-18 — Автоматизация деплоя (CI/CD)
  - Автоматическая сборка Docker-образа при каждом пуше в ветку `main`
  - Публикация готовых Docker-образов в Docker Hub
  - Автоматическое применение миграций и сборка статики при старте контейнера
  - Автоматический деплой (CD) на Render.com
  - **security**: Ключи вынесены в GitHub Secrets
---

#### 2026-02-21 — Публичный профиль, социальные механики и UI-улучшения
- **feat**: Реализована публичная страница пользователя `/u/<username>/` с отображением публичного плейлиста.
- **feat**: Добавлены лайки публичных плейлистов:
  - модель `PlaylistLike`
  - API: `GET /api/playlists/public/<username>/`, `POST/DELETE /api/playlists/public/<username>/like/`
  - API трендов: `GET /api/playlists/public/trending/`
- **feat**: Добавлены уведомления о лайках через сигналы:
  - модель `PlaylistLikeNotification`
  - автоматическое создание записи при новом лайке (кроме self-like)
- **feat**: Добавлена возможность переименования избранного плейлиста через `PATCH /api/playlists/me/` (desktop + mobile UI).
- **ui**: Обновлен публичный профиль:
  - мини-статистика (лайки, треки, дата обновления)
  - переключатель вида треков (Список/Сетка) для desktop
  - улучшенная адаптивность на mobile
  - GSAP stagger-анимации списка и анимация контейнеров
- **ui**: Доработаны стили профиля/плейлистов (аватар, кнопки, фильтры, выравнивание show-more, pre-animation блоки).
- **test**: Добавлены тесты для новой логики API и моделей (публичные плейлисты, лайки, уведомления, rename playlist).
- **статус тестов**: успешно пройдено **41 тест** (`41 passed`).
---

#### 2026-02-28 — Wikipedia API, биографии артистов и модальное окно
- **feat**: Добавлен отдельный batch API Wikipedia: `POST /api/wikipedia/artists/`
  - возвращает `bio`, `image_url`, `title`, `source_url`
  - поддерживает язык `ru` с fallback на `en`
  - реализовано кэширование результатов и async batch-запросы
- **feat**: Реализовано глобальное модальное окно биографии артиста с возможностью вызова из разных разделов:
  - публичный профиль
  - личные плейлисты
  - Trending Artists
  - Year Chart
  - поисковая выдача
- **animation**: Добавлена отдельная GSAP-анимация закрытия модального окна (`glass morphism / zoom-out`).
- **refactor**: Вынесена логика Wikipedia в отдельный view-модуль `wikipedia_async.py`.
- **test**: Добавлены и успешно пройдены pytest-тесты для Wikipedia API (`/api/wikipedia/artists/`).
---

#### 2026-03-01 — Throttling, индексы БД и поддержка mbid
- **feat**: Глобальный throttling для DRF в `base.py`:
  - `DEFAULT_THROTTLE_CLASSES`: `AnonRateThrottle`, `UserRateThrottle`
  - `DEFAULT_THROTTLE_RATES`: анонимы — 100/час, авторизованные — 1000/час
- **perf**: Индексы для моделей `Playlist` и `PlaylistLike`:
  - `Playlist`: индекс по полям `(user, created_at)` для ускорения `_get_or_create_favorites`
  - `PlaylistLike`: индексы по `playlist` и `user` для быстрой фильтрации лайков
- **feat**: Поддержка **mbid** (MusicBrainz ID) для стабильной идентификации треков:
  - Хелпер `_build_track_cache_key` — использует mbid при наличии, иначе `(artist, name)`
  - iTunes, Deezer и Last.fm `track.getInfo` применяют mbid в ключах кэша
  - API плейлистов: опциональное поле `mbid` в `POST/DELETE /api/playlists/me/tracks/`
  - Хранение mbid в `Playlist.tracks`, дедупликация по mbid, fallback на name+artist
  - Фронтенд передаёт mbid при добавлении (Year Chart, поиск) и удалении треков

  **test**: 
    * Добавлены кейсы: `test_playlist_add_track_stores_mbid_when_provided` и `test_playlist_add_track_dedup_by_mbid`.
    * **Результат**: 49 тестов пройдены успешно (Full Green).
---

#### 2026-03-02 — Frontend Unit Testing, WebSocket и CI-разделение пайплайна
- **test**: Добавлена полноценная инфраструктура frontend unit-тестов на **Vitest** (`tests/js`).
  - Покрыты модули: `favorite-button`, `music_search`, `playlists`, `public-playlist`, `artist_wikipedia_modal`, `year2025`, `trending`.
  - Проверены сценарии: фильтры, сортировка, пагинация, cache TTL, batching очередей, fallback-обработка ошибок API.
  - Итог: **39 тестов успешно пройдены** (`7 files, 39 passed`).
- **ci**: GitHub Actions разделен на отдельные job:
  - `lint` (Python code style),
  - `frontend-test` (Node setup, `npm ci`, `npm run lint:js`, `npx vitest run`),
  - `test` (backend pytest + миграции) с зависимостью от `lint` и `frontend-test`.
- **chore**: Добавлены настройки **ESLint + Prettier** и npm-скрипты для frontend (`lint:js`, `lint:js:fix`, `format`, `format:check`).
- **feat**: Добавлен **WebSocket** через **Django Channels** для realtime-уведомлений без перезагрузки страницы (`ws/notifications/`).
- **feat**: Реализован WebSocket-канал уведомлений через **Django Channels**:
  - endpoint: `ws/notifications/` для авторизованных пользователей;
  - realtime push-уведомления о новых лайках публичного плейлиста;
  - backend: `ProtocolTypeRouter`, `CHANNEL_LAYERS`, `NotificationConsumer`, отправка из `users/signals.py`;
  - frontend: обновление блока уведомлений профиля без перезагрузки (`realtime_notifications.js`).
- **feat**: Реализован WebSocket-канал **presence** (онлайн-статус):
  - endpoint: `ws/presence/`;
  - backend: `PresenceConsumer` + счетчик активных websocket-соединений в кэше;
  - frontend: live-индикатор `Онлайн/Оффлайн` и зеленый кружок у аватара на публичной странице.
- **feat**: Добавлены комментарии к публичным плейлистам:
  - API: `GET/POST /api/playlists/public/<username>/comments/`;
  - API: `DELETE /api/playlists/public/<username>/comments/<comment_id>/`;
  - права удаления: автор комментария или владелец публичного плейлиста;
  - frontend: форма, список, счетчик комментариев, удаление в UI.
- **feat**: Реализован WebSocket-канал realtime-комментариев:
  - endpoint: `ws/comments/public/<username>/`;
  - события: `playlist_comment_created`, `playlist_comment_deleted`;
  - синхронизация комментариев между вкладками/клиентами без перезагрузки.
- **test**: Добавлены websocket-тесты backend:
  - запрет подключения анонимного пользователя;
  - доставка realtime-события при создании лайка.
- **test**: Добавлены backend-тесты для комментариев:
  - список/создание/удаление комментариев и проверка permission-правил;
  - websocket-доставка realtime-событий для публичных комментариев.
---

#### 2026-03-06

- **feat (comments/replies)**: Реализована древовидная система комментариев с одним уровнем вложенности (replies/threads).
  - Добавлено поле `parent` в `PlaylistComment` (self-FK) + индекс по `parent, created_at`.
  - `POST /api/playlists/public/<username>/comments/` теперь принимает `parent_id`.
  - Ограничение: ответы только на корневые комментарии (ответ на ответ запрещен).
  - `GET /comments/` возвращает структуру: корневые комментарии + `replies`.
  - `DELETE /comments/<id>/` для корневого комментария удаляет также его ответы.
  - В websocket-событие удаления добавлен `deleted_ids` (id удаленного комментария и его дочерних ответов).
- **feat (frontend comments UI)**: Обновлён интерфейс комментариев.
  - Добавлена кнопка `Ответить` для корневых комментариев.
  - Добавлен режим ответа в форме (`Ответ для ...` + `Отмена`).
  - Добавлен вложенный рендер ответов в thread layout.
  - Обновлена логика удаления комментариев/ответов на клиенте.
- **feat (like notifications sync)**: Синхронизация уведомлений лайков в профиле.
  - При снятии лайка в публичном избранном удаляется соответствующее уведомление в блоке `#block-like-notifications`.
  - Добавлен серверный websocket payload `playlist_like_removed`.
  - Расширен payload `playlist_like` (`notification_id`, `actor_id`, `playlist_id`) для точного матчирования и удаления на фронте.
  - Добавлены `data-*` атрибуты в шаблон профиля для существующих уведомлений.
  * **Результат**: 61 тестов пройдены успешно (Full Green).
----

#### 2026-03-09 — Frontend тесты системы комментариев
- **test**: Добавлены frontend тесты на Vitest для системы комментариев (`tests/js/public-playlist-comments.test.js`):
  - jsdom-сценарии: инициализация, загрузка и рендер комментариев, обновление счетчика/empty-state
  - форма: создание комментария, валидация пустого ввода, ответы (`parent_id`)
  - удаление: DELETE-флоу через UI и синхронизация DOM
  - realtime: обработка WebSocket-событий `playlist_comment_created` и `playlist_comment_deleted`
  - устойчивость: мок анимаций (`PublicCommentsAnimation`) и проверка интеграции
- **Результат**: `npx vitest run` — **47 тестов пройдены успешно** (8 test files, Full Green).

---

### ⚡ Быстрый запуск <a id="quick-start"></a>

**Использование готового образа:**

- Вы можете запустить проект одной строкой. Команда скачает конфигурацию, поднимет контейнеры, применит миграции и откроет сайт

**Для macOS/Linux (Terminal)**
```bash
curl -sSL https://raw.githubusercontent.com/MRGiorgiosDev8/musicPlatform_api_django/main/deploy.yml > docker-compose.yml && \
docker compose up -d && \
sleep 5 && \
docker compose exec web python manage.py migrate && \
open http://localhost:8000
```
Для Windows (PowerShell)
```bash
curl -sSL https://raw.githubusercontent.com/MRGiorgiosDev8/musicPlatform_api_django/main/deploy.yml > docker-compose.yml; `
docker compose up -d; `
Start-Sleep -Seconds 5; `
docker compose exec web python manage.py migrate; `
start http://localhost:8000
```

- Остальной запуск про локальный dev — для тех, кто хочет разбираться глубже.


## 🚀 Запуск проекта <a id="run"></a>

### 🔹 1. Клонирование репозитория
```bash
git clone https://github.com/MRGiorgiosDev8/musicPlatform_api_django.git
cd musicPlatform_api_django
```

### 🔹 2. Создание и настройка .env

Создайте файл `.env` в корне проекта на основе шаблона:
```bash
cp .env.example .env
```

Пример содержимого `.env.example`:
```bash
DEBUG=1

# Сгенерируйте новый ключ
SECRET_KEY=django-insecure-change-me-to-something-secret

ALLOWED_HOSTS=*

# API-ключ Last.fm
LASTFM_KEY=your_lastfm_api_key_here

# Настройки Redis
REDIS_PORT=6379
REDIS_DB=0
```

Для генерации нового случайного значения SECRET_KEY выполните:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 🔑 Получение API ключей
- Зарегистрируйтесь на [Last.fm API](https://www.last.fm/api/account/create) и получите персональный API-ключ.
- Вставьте полученный ключ в переменную `LASTFM_KEY` в файле `.env`.

---

### 🛠 Предварительные требования

- Для корректной работы проекта в локальной среде должны быть установлены и запущены следующие сервисы:

* **PostgreSQL** — основная база данных. 
* **Redis** — используется для кэширования и сессий.

#### **Быстрый запуск сервисов:**

| ОС | Команда запуска (Redis + Postgres) |
| :--- | :--- |
| **macOS** | `brew services start redis && brew services start postgresql` |
| **Linux** | `sudo systemctl start redis-server postgresql` |
| **Windows** | Используйте **WSL2** или запустите сервисы через Docker: |


---
1. **Создание виртуального окружения:**
```bash
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows
venv\Scripts\activate
```
2.	**Установка зависимостей:**
```bash
pip install -r requirements.txt
```
3. **Сбор статических файлов**
```bash
python manage.py collectstatic --noinput
```
4.  **Подготовка и применение миграций к PostgreSQL**
```bash
python manage.py makemigrations
python manage.py migrate
```

5**Запуск сервера разработки:**
```bash
uvicorn music_project.asgi:application --reload
```
⚠️ Проект использует полноценную асинхронную архитектуру (ASGI, httpx.AsyncClient, asyncio.gather).
Поэтому **не рекомендуется** использовать `python manage.py runserver`, так как он работает в
синхронном режиме и значительно снижает производительность.

### 🔹 Сборка и запуск через Docker
**Сборка и запуск контейнеров:**
```bash
docker compose up -d --build
``` 
**Настройка базы данных:**
```bash
# Применение миграций (создание таблиц в PostgreSQL)
docker compose exec web python manage.py migrate
``` 
```bash
# Создание администратора
docker compose exec web python manage.py createsuperuser
``` 

#### 🔗 Публичный доступ к проекту через туннель
При необходимости могу показать работающее приложение в сети, используя SSH-туннель.
Запустив его, скину публичный URL, по которому можно открыть проект.
