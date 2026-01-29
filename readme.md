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

Создайте файл `.env` в корне проекта и добавьте туда следующие переменные:

```bash
touch .env - # macOS / Linux
New-Item .env -ItemType File - # Windows
```
Пример содержимого .env:
```bash
DEBUG=1
SECRET_KEY=george_music_project8
ALLOWED_HOSTS=*
LASTFM_KEY=49b6213396a4b5a21637bcf627a4bf3d
```

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
python manage.py runserver
```
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