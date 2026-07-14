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

---

#### 2026-03-10
- **feat**: Внедрена система **асинхронного тестирования (pytest)**:
  - Написаны тесты для асинхронных сервисов (`test_services_async.py`), публичного API и системы плейлистов.
  - Реализована полная изоляция через `respx` (моки внешних API) и автоматическая очистка Redis.
  - Подтверждена стабильность работы **Event Loop** и асинхронных соединений `httpx`.
- **infra**: Обеспечена 100% совместимость тестов как в Docker-контейнерах, так и в локальной среде (macOS + Homebrew).
- **Статус**: 8 тестов успешно пройдены (8 passed).
  - Скорость выполнения в Docker: **6.20s** 
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

#### 2026-03-10 — Подключение Redis для Render
- **feat**: Подключен Redis для Render через `music_project/settings/prod.py`.
  - Активируется при наличии `REDIS_URL`.
  - Настроены `CACHES` и `CHANNEL_LAYERS` на Redis.
  - Добавлен быстрый `ping` при старте для проверки соединения (лог: `REDIS CHECK: Connection Successful!`).
  - 
---

#### 2026-03-11
- **feat**: Автодополнение поиска по артистам (dropdown).
  - Новый API: `/music_api/search/artists/` с кэшем по `q + locale`.
  - Клиентский autocomplete с фильтрацией по префиксу и сортировкой по популярности (listeners).
  - Подключение к существующему localStorage-кэшу поиска.
- **ui**: Анимация dropdown (blur + fade + scale 0.8 → 1, закрытие до scale 0) на CSS.
- **perf**: Оптимизирован `tracks_count` в публичных плейлистах через SQL-функции JSON.
- **fix**: Нормализация запроса поиска в кэше (`lower`, collapse spaces, `Accept-Language`).
- **fix**: Нормализация названий/артистов для дедупликации треков в плейлисте (NFKD, trim, lower, удаление диакритики).
- **tests**: Добавлены pytest-тесты для `/music_api/search/artists/` и vitest-тесты для автокомплита.
- * **Результат**: 64 pytest и vitest 50 (9 test files) тестов пройдены успешно (Full Green).
---

**2026-03-14**
- Глобальный чарт переведен на Apple RSS, эндпоинт `music_api/apple-chart/`.
- Добавлено обогащение статистики из Last.fm для Apple-чарта (listeners/playcount).
- Добавлен и настроен `audio_proxy` с кэшированием в Redis и защитой от 403/expired.
- Кэширование тяжелых API-эндпоинтов: поиск, year-chart, apple-chart.

---

#### 2026-04-03 — Reply-to-user для комментариев (без углубления дерева)
- **feat (comments API)**: Добавлена адресная логика ответов.
  - В `PlaylistComment` добавлено поле `reply_to_user` (`FK -> users.User`, nullable).
  - `POST /api/playlists/public/<username>/comments/` теперь поддерживает `reply_to_comment_id`.
  - Валидация: цель ответа должна быть в том же треде (root или reply этого root).
  - Ограничение глубины сохранено: вложенность остается только `root -> reply`.
- **feat (comments payload)**: В ответах API и websocket payload комментариев добавлены поля:
  - `reply_to_user_id` 
  - `reply_to_username` 
- **ui (comments)**: Кнопка `Ответить` доступна и у reply-комментариев.
  - При ответе на reply фронтенд отправляет `parent_id=<root>` и `reply_to_comment_id=<target_comment>`.
  - В рендере reply показывается маркер `Ответ @username`.

---

#### 2026-04-12 — Emoji picker в комментариях публичного профиля
- **feat (comments/ui)**: Добавлен `emoji-picker-element` в форму комментариев (`/u/<username>/`):
  - кнопка открытия `Эмодзи` рядом с отправкой комментария;
  - вставка выбранного emoji в `textarea` в текущую позицию курсора;
- **ui**: Кастомизирована тема picker под стиль проекта:
  - белый фон, скругления, ruby-акцент
- **responsive**: Реализована мобильная адаптация picker:
  - на mobile отображается как компактный `bottom sheet` (фиксированный у нижнего края);
  - уменьшены размеры emoji-сетки для узких экранов.
- **animation**: Добавлена плавная spring-анимация открытия/закрытия picker с учетом `prefers-reduced-motion`.
- **test**: Проверена совместимость с существующими frontend-тестами (`vitest`) — все тесты проходят успешно.

---

#### 2026-05-08
- **feat (mobile)**: Глобально убраны левые/правые отступы на мобильной версии (`container`, `row`, `gutter`) для более "full-width" интерфейса.
- **perf (frontend)**: Добавлена ленивая инициализация тяжёлых анимаций через `IntersectionObserver`:
  - `static/js/animation/animation_home.js` 
  - `static/js/animation/playlist_stagger_animation.js` 
- **feat (player/now-playing)**:
  - добавлен мини-плеер с `play/pause`, прогресс-баром, таймингом и переходом к карточке трека;
  - добавлена кнопка закрытия мини-плеера (крестик);
  - мини-плеер автоматически скрывается, когда исходный плеер в viewport, и появляется при уходе скроллом;
  - мини-плеер подключён к GSAP Morph-анимации кнопки и pulse-эффекту кольца;
  - добавлены light/dark стили и свечение в dark theme.
- **feat (home/dark-theme)**:
  - доработаны цвета тёмной темы (включая `trending-genre-container`, `year-genre-container`, breadcrumbs, audio-time и др.);
  - добавлены постеры в `home.html`, улучшены стили (`.home-poster-image`, тени, адаптивность).

---

#### 2026-05-27 — Healthchecks, readiness/liveness и метрики django-prometheus
- **feat (metrics)**: Подключен `django-prometheus`:
  - добавлен endpoint `GET /metrics`;
  - включены HTTP-метрики Django (RPS, latency, status codes);
  - включены PostgreSQL-метрики через prometheus database backend.
- **infra (monitoring/local)**: Добавлен локальный monitoring stack через Docker Compose:
  - `Prometheus` на [http://localhost:9090](http://localhost:9090);
  - `Grafana` на [http://localhost:3000](http://localhost:3000);
  - конфигурация Prometheus находится в `monitoring/prometheus/prometheus.yml`;
  - Grafana datasource и dashboard provisioned автоматически из `monitoring/grafana/`.
- **dashboard (grafana)**: Добавлен стартовый дашборд `RubySound Overview`:
  - `RPS (all)`;
  - `P95 Request Latency`;
  - `5xx Error Ratio`;
  - `P95 DB Query Duration`;
  - `DB Connections Created Total`.
- **note (production)**: Prometheus/Grafana подключены как локальный observability-контур для демонстрации production-подхода.
- **feat (health/api)**: Добавлены эндпоинты состояния сервиса:
  - `GET /health/live` — liveness-проверка (жив ли процесс приложения);
  - `GET /health/ready` — readiness-проверка готовности приложения к обработке трафика.
- **feat (health/dependencies)**: В `ready` добавлены проверки зависимостей:
  - `PostgreSQL` (`SELECT 1`);
  - `Redis` (cache round-trip `set/get`);
  - внешний API `Last.fm` (короткий запрос с таймаутом).
- **refactor (health/ready)**: `ready` теперь учитывает только критичные зависимости:
  - критичные: `PostgreSQL`, `Redis`;
  - `Last.fm` переведен в `soft check` (информативная проверка, не влияет на HTTP-статус readiness).
- **perf (health/external)**: Для `Last.fm` добавлен кэш статуса в Redis на 5 минут:
  - реальный внешний запрос выполняется не чаще 1 раза в 300 секунд;
  - при повторных запросах используется кэшированное состояние (`cached`).
- **infra (docker-compose)**: Добавлены `healthcheck` для сервисов:
  - `web` — проверка `http://127.0.0.1:8000/health/live`;
  - `postgres` — `pg_isready`;
  - `redis` — `redis-cli ping`.
- **infra (startup-order)**: Для `web` включена зависимость от статуса `service_healthy` у `postgres` и `redis`.
- **ops**: Подтверждена корректная работа health-эндпоинтов локально и прохождение тестов после внедрения.
- **verify (manual)**: Быстрая ручная проверка health-эндпоинтов после запуска:
  ```bash
  curl http://localhost:8000/health/live
  curl http://localhost:8000/health/ready
  ```
  - `live` ожидаемо возвращает `200 OK`.
  - `ready` возвращает `200`, если `Postgres/Redis` в порядке, даже если `Last.fm` недоступен.

---

#### 2026-06-02 — Нагрузочное тестирование k6
- **feat (loadtesting)**: Добавлен локальный `k6`-сценарий для проверки производительности и устойчивости endpoints.
  - `GET /health/live`;
  - `GET /music_api/trending/`;
  - `GET /music_api/search/`;
  - `GET /music_api/search/artists/`;
  - `GET /api/playlists/public/trending/`;
  - `GET /music_api/year-chart/`.
- **feat (auth/loadtesting)**: При наличии `LOADTEST_USERNAME` и `LOADTEST_PASSWORD` сценарий дополнительно проверяет:
  - `GET /api/users/me/`;
  - `GET /api/playlists/me/`.
- **infra (compose)**: Добавлен отдельный `docker-compose.k6.yml`, чтобы запускать нагрузочный тест без ручной установки `k6`.
- **infra (make)**: Добавлена команда `make k6-load`.
---

#### 2026-06-22 — PWA (Progressive Web App)
- **feat (pwa/manifest)**: Добавлен `static/manifest.json` с режимом `"display": "standalone"`.
  - иконки: `ruby-touch-icon.png`, `poster_music.png`;
  - подключение через `<link rel="manifest">` и meta-теги PWA в `base.html`.
- **feat (pwa/service-worker)**: Добавлен `static/service-worker.js` со стратегией **Cache First** для базовой статики:
  - HTML-навигация, CSS, JS, логотип и vendor-ресурсы из `/static/`;
  - precache ключевых shell-ресурсов при `install`.
- **feat (pwa/network-only)**: Аудио и музыкальные запросы исключены из кэша (**Network Only**):
  - превью/стриминг (`destination: audio`, расширения `.mp3/.m4a/...`);
  - эндпоинты `/music_api/`, `/api/`, `/health/`, WebSocket и внешние музыкальные домены (iTunes, Deezer, Last.fm и др.).
- **feat (pwa/register)**: Добавлен `static/js/pwa/register.js` — регистрация Service Worker на `/service-worker.js`.
- **infra (pwa)**: Service Worker отдаётся с корня сайта через `music_project/pwa_views.py` (`Service-Worker-Allowed: /`).

---

## 2026-07-11 — Центр резервного копирования (Backup & Restore Control Panel)
- **feat**: Добавлен backup-центр в Django admin для `superuser`.
  - Кнопка `Сделать backup` создает PostgreSQL dump через `pg_dump`.
  - На главной странице админки отображается последний backup и лимит хранения.
  - Добавлен список backup-файлов с действиями: скачать, восстановить, удалить.
- **feat**: Добавлено восстановление базы из backup прямо из админки.
  - Перед restore выполняется `logout(request)`, чтобы избежать `SessionInterrupted` после замены базы.
  - Restore выполняется через отдельный экран подтверждения.
- **feat**: Добавлена автоочистка backup-файлов по лимиту `BACKUP_KEEP_COUNT`.
  - После создания нового backup старые файлы сверх лимита удаляются автоматически.
  - Добавлена ручная кнопка `Очистить старые` в backup-центре.
- **ui**: На странице `admin/login` добавлена кнопка перехода на главную страницу сайта.
- **infra**: В Docker-образ добавлен `postgresql-client`, чтобы `pg_dump` и `pg_restore` были доступны в контейнере.
- **test**: Добавлены тесты для backup-центра, restore, автоочистки и шаблона login admin.
