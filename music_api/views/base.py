import logging
from decouple import config

# Центральный логгер приложения
# Используется для логирования ошибок и событий
logger = logging.getLogger(__name__)

# API-ключ Last.fm
# Загружается из переменных окружения
# (не хранится в коде и не коммитится в репозиторий)
LASTFM_KEY = config("LASTFM_KEY")