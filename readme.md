![GitHub last commit](https://img.shields.io/github/last-commit/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Repository size](https://img.shields.io/github/repo-size/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-%23e0115f)
![License](https://img.shields.io/github/license/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)

# 🎵 RubySound.fm 

**RubySound.fm** — веб-приложение на **Django + Django REST Framework** для поиска музыки,
прослушивания превью треков, просмотра трендовых артистов и актуальных музыкальных чартов.

Проект объединяет данные из **Last.fm**, **Deezer** и **iTunes**, предоставляет REST API и интерактивный frontend
с возможностью прослушивания превью треков и анимациями.

---


## 🚀 Запуск проекта

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
```

Для генерации нового случайного значения SECRET_KEY выполните:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 🔑 Получение API ключей
- Зарегистрируйтесь на [Last.fm API](https://www.last.fm/api/account/create) и получите персональный API-ключ.
- Вставьте полученный ключ в переменную `LASTFM_KEY` в файле `.env`.

### 🔹 2. Локальный запуск
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
4.	**Запуск сервера разработки:**
```bash
uvicorn music_project.asgi:application --reload
```
⚠️ Проект использует полноценную асинхронную архитектуру (ASGI, httpx.AsyncClient, asyncio.gather).
Поэтому **не рекомендуется** использовать `python manage.py runserver`, так как он работает в
синхронном режиме и значительно снижает производительность.

### 🔹 Запуск через Docker

1. **Сборка Docker-контейнера:**
```bash
docker compose build
```
2.	**Запуск контейнера:**
```bash
docker compose up
```
### 🔹Вариант 2: Использование готового образа
1.	**Скачивание последнего образа:**
```bash
docker pull georgio8/music_project:latest
```
2.	**Запуск контейнера(Mac OS, Linux, Windows)**
```bash
docker run -p 8000:8000 georgio8/music_project:latest
```
#### 🔗 Публичный доступ к проекту через туннель
При необходимости могу показать работающее приложение в сети, используя SSH-туннель.
Запустив его, скину публичный URL, по которому можно открыть проект.