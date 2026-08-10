import logging
from decouple import config
from django.shortcuts import render, redirect

# Центральный логгер приложения
# Используется для логирования ошибок и событий
logger = logging.getLogger(__name__)

# API-ключ Last.fm
# Загружается из переменных окружения
# (не хранится в коде и не коммитится в репозиторий)
LASTFM_KEY = config("LASTFM_KEY")
THEAUDIO_DB_API_KEY = config("THEAUDIO_DB_API_KEY", default="123")


def search_page_view(request):
    query = (request.GET.get("q") or "").strip()
    if not query:
        return redirect("home")
    return render(request, "index.html")
