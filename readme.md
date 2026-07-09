![GitHub last commit](https://img.shields.io/github/last-commit/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Repository size](https://img.shields.io/github/repo-size/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-%23e0115f)
![License](https://img.shields.io/github/license/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Tests](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/tests.yml?label=tests&logo=github&color=%23e0115f)
![Deploy](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/main.yml?label=deploy&logo=github&color=%23e0115f)

# 🎵 RubySound.fm
**RubySound.fm** — полнофункциональный музыкальный агрегатор с асинхронной архитектурой на Django + DRF, объединяющий данные из Last.fm, Deezer и iTunes.

Проект построен на **ASGI-архитектуре**, поддерживает высокую нагрузку за счет параллельных запросов и включает глубокую систему взаимодействия с пользователем.

- 🔍 **Умный асинхронный поиск**: Мгновенный сбор данных из трех внешних источников одновременно (batch-запросы).
- 📈 **Интерактивные чарты**: Динамические списки популярных артистов/трэков с фильтрацией по жанрам.
- 🎧 **Мультимедиа**: Прослушивание превью треков и бесшовная подгрузка метаданных.
- 🧠 **Автокомплит поиска**: Быстрые подсказки артистов в dropdown по мере ввода.
- ❤️ **Личная библиотека**: Создание персональных плейлистов (Favorites), управление списком избранного и **умная фильтрация** (поиск по старым/новым релизам или конкретным артистам внутри ваших подборок).
- 🌍 **Публичные плейлисты**: Страница пользователя с публичным плейлистом и мини-статистикой.
- 👍 **Социальные механики**: Лайки публичных плейлистов, рейтинг на dashboard, комментарии к публичным плейлистам и уведомления о новых лайках.
- 🟢 **Presence (Online Status)**: realtime-статус пользователя на публичной странице (онлайн/оффлайн) с live-обновлением через WebSocket.
- 💬 **Realtime комментарии**: Форма комментариев, удаление по правам (автор/владелец) и live-синхронизация списка комментариев через WebSocket без перезагрузки.
- 📚 **Wikipedia API + Artist Bio Modal**: При клике на имя артиста открывается модальное окно с биографией артиста (RU/EN fallback), фото из Wikipedia и анимациями на GSAP.
- 📱 **Mobile First**: Интерфейс полностью адаптирован для использования на смартфонах.
- 🌗 **Переключение темы**: Переключатель светлой/тёмной темы.
- 🔐 **Безопасность**: Регистрация и аутентификация пользователей на базе JWT-токенов.
- 🛠️ **Django Admin**: Административная панель для управления пользователями, плейлистами, комментариями и контентом проекта.
- ⚡ **Высокая производительность**: Оптимизация запросов и кэширование данных через Redis.
- ❤️‍🩹 **Healthchecks (Liveness/Readiness)**: Эндпоинты `/health/live` и `/health/ready` для проверки живости сервиса и готовности зависимостей (PostgreSQL, Redis, внешний API).
- 📊 **Метрики и локальный мониторинг**: `django-prometheus` экспортирует метрики на `/metrics`, Prometheus собирает RPS/latency/5xx/DB-метрики, Grafana отображает их в дашборде.
- 📈 **Нагрузочное тестирование**: `k6`-сценарий для проверки public endpoints, search, trending и auth-путей на локальном Docker Compose-стеке.
- 📱 **Progressive Web App (PWA)**: Возможность установки сайта как приложения на любое устройство (режим `standalone`).
- 🔄 **CI/CD**: Автоматизированное тестирование и деплой через GitHub Actions, контейнеризация проекта с Docker

---
* **Live Demo:** 🌍 [georgios8-rubysoundfm.onrender.com](https://georgios8-rubysoundfm.onrender.com)
---

## 📑 Оглавление
- [⚡ Быстрый запуск](#quick-start)
- [🐍 Стек](#stack)
- [🎨 Фронтенд](#frontend)
- [🐳 Docker](#docker)
- [💾 Backup и Restore](#backup-restore)
- [📈 Load Testing (k6)](#load-testing)
- [🧪 Тестирование](#testing)
- [🚀 Деплой и CI/CD](#deploy)
- [📖 API Documentation](#api-docs)
- [🚀 Запуск проекта](#run)

---

## 📑 [История изменений](./CHANGELOG.md)

---


## 🐍 Стек <a id="stack"></a>

- **Python 3.12**
- **Django**
- **Django REST Framework** + **JWT**
- **Redis** (Кэш и сессии)
- **PostgreSQL** (Основная БД)
- **Pytest** (Тесты)
- **Vitest** (Unit-тесты фронтенда)
- **k6** (нагрузочное тестирование)
- **WebSocket (Django Channels)** (realtime-обновления)
- **Prometheus** (сбор RPS, latency, 5xx и DB-метрик локально через Docker Compose)
- **Grafana** (дашборд для визуализации метрик)
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
- Локально через Docker Compose поднимается observability-контур:
  - `Prometheus` — [http://localhost:9090](http://localhost:9090)
  - `Grafana` — [http://localhost:3000](http://localhost:3000), логин по умолчанию `admin/admin`
  - Django-метрики доступны на `/metrics` и собираются Prometheus с `web:8000/metrics`
  - Дашборд `RubySound Overview` показывает RPS, p95 latency, 5xx error ratio и DB-метрики
  - Важно: этот monitoring stack предназначен для локального Docker Compose-окружения; production-деплой на Render не поднимает Prometheus/Grafana автоматически

---

### 💾 Backup и Restore <a id="backup-restore"></a>

Для локальной PostgreSQL-базы добавлена простая стратегия резервного копирования и восстановления через Docker Compose.

#### Что делает backup
- Создает `custom dump` базы `music_platform` из контейнера `postgres`
- Сохраняет файл в `backups/` с timestamp в имени

#### Команды
```bash
make db-backup
```

Файл будет создан примерно в таком виде:
```bash
backups/music_platform_20260528-143000.dump
```

Восстановление:
```bash
make db-restore FILE=backups/music_platform_20260528-143000.dump
```

---

### 📈 Load Testing (k6) <a id="load-testing"></a>

Для локального нагрузочного тестирования добавлен `k6`-сценарий, который бьет по реальным публичным endpoints проекта:

- `GET /health/live`
- `GET /music_api/trending/`
- `GET /music_api/search/`
- `GET /music_api/search/artists/`
- `GET /api/playlists/public/trending/`
- `GET /music_api/year-chart/`

Если указать `LOADTEST_USERNAME` и `LOADTEST_PASSWORD`, сценарий дополнительно проверит:
- `GET /api/users/me/`
- `GET /api/playlists/me/`

#### Запуск
```bash
make k6-load
```

#### Настройка
Параметры можно менять в `docker-compose.k6.yml`:
```bash
K6_BASE_URL=http://localhost:8000
PUBLIC_QUERY=metallica
YEAR_GENRE=rock
TRENDING_LIMIT=10
SEARCH_LIMIT=12
STEADY_SLEEP=1
```

#### Результаты базового тестирования производительности

| Метрика | Значение | Описание |
| :--- | :--- | :--- |
| **Общее кол-во запросов (RPS)** | `59.0 req/s` (Всего: 5937) | Интенсивность потока запросов к API |
| **Успешность запросов (Success Rate)** | `100.00%` (Ошибок: `0.00%`) | Стабильность бэкенда под нагрузкой |
| **Успешность чеков (Checks)** | `100.00%` (5937 из 5937) | Валидация корректности всех ответов (HTTP 200/201) |
| **Среднее время ответа (Avg)** | `251.92 ms` | Средняя скорость обработки одного запроса |
| **Медианное время ответа (Med)** | `211.33 ms` | Типичное время ожидания для большинства пользователей |
| **Пиковое время ответа (p95)** | `544.90 ms` | Скорость ответа для 95% самых "тяжелых" запросов |
| **Сетевой трафик (Data Received)** | `24 MB` (~234 kB/s) | Объем переданных данных от API к клиенту |

#### 🛠️ Анализ результатов и инфраструктура

* **Надежность:** Бэкенд на Django продемонстрировал 100% отказоустойчивость под нагрузкой в 25 VU — во время теста не зафиксировано ни одного сбоя (`http_req_failed = 0.00%`).
* **Безопасность и Авторизация:** Интеграция JWT-авторизации успешно выдержала нагрузочный тест. Процесс генерации и верификации токенов для эндпоинтов `/api/users/me/` и `/api/playlists/me/` не создал критической нагрузки на процессор и базу данных PostgreSQL.
* **Эффективность кэширования:** Все пороговые значения (`thresholds`) успешно пройдены. Пиковое время ответа для 95% запросов составило всего `p95 = 544.9 ms` (при лимите в `1500 ms`), что подтверждает эффективную работу кэширования тяжелых внешних интеграций (Last.fm, iTunes,Deezer) внутри **Redis**.
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
* **Кэширование:** Используется **Redis (Render)** для кэша и Channels.
* **Локация:** Сервер расположен во **Франкфурте**.
> **Важно (Render Storage):** Для деплоя используется Render с эфемерной файловой системой (Ephemeral File System). При перезапуске контейнера или новом деплое локальное хранилище очищается, поэтому пользовательские медиа-файлы (например, аватарки) не сохраняются на диске сервера.

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
