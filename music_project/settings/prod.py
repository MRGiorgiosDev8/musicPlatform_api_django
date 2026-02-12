"""
Production settings for music_project project.
"""
from .base import *

# Отключаем режим отладки в продакшене
DEBUG = False

# Разрешённые хосты для продакшена, по умолчанию локальные адреса для тестирования в Docker
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1,0.0.0.0").split(",")

# База данных берется из DATABASE_URL (PostgreSQL)

# Настройки безопасности для локального тестирования в Docker (не подходят для облачного деплоя)
SECURE_BROWSER_XSS_FILTER = True  # Включаем фильтр XSS в браузере для защиты от межсайтовых скриптов
SECURE_CONTENT_TYPE_NOSNIFF = True  # Запрещаем браузеру угадывать MIME-тип контента
SECURE_HSTS_INCLUDE_SUBDOMAINS = True  # Включаем HSTS для всех поддоменов
SECURE_HSTS_SECONDS = 0  # Отключаем HSTS (HTTP Strict Transport Security) для локального тестирования
SECURE_REDIRECT_EXEMPT = []  # Список URL, исключённых из перенаправления на HTTPS (пустой)
SECURE_SSL_REDIRECT = False  # Отключаем принудительное перенаправление на HTTPS для локального тестирования
SESSION_COOKIE_SECURE = False  # Куки сессии не требуют HTTPS (для локального тестирования)
CSRF_COOKIE_SECURE = False  # Куки CSRF не требуют HTTPS (для локального тестирования)
X_FRAME_OPTIONS = 'DENY'  # Запрещаем отображение сайта в iframe для защиты от кликджекинга

# Настройки почтового сервера для отправки email в продакшене
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Используем SMTP backend
EMAIL_HOST = config("EMAIL_HOST", default="")  # Хост SMTP сервера
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=587)  # Порт SMTP сервера (обычно 587 для TLS)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", cast=bool, default=True)  # Используем TLS для шифрования почты
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")  # Логин для SMTP
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")  # Пароль для SMTP

# Хранение и сжатие статических файлов в продакшене с помощью WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'  # Сжатие и кэширование статики с манифестом

# Включаем сжатие файлов для уменьшения размера перед отдачей клиенту
COMPRESS_ENABLED = True  # Включаем сжатие
COMPRESS_OFFLINE = True  # Сжатие выполняется оффлайн при сборке

# Логирование для продакшена с выводом в консоль и файл
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,  # Не отключаем существующие логгеры
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',  # Подробный формат логов
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',  # Логируем сообщения уровня INFO и выше в файл
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',  # Путь к файлу логов
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',  # Логируем INFO и выше в консоль
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],  # Логи отправляем и в консоль, и в файл
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],  # Логи django также в консоль и файл
            'level': 'INFO',
            'propagate': False,
        },
        'music_api': {
            'handlers': ['console', 'file'],  # Логи приложения music_api в консоль и файл
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Создаем директорию для логов, если её нет, чтобы избежать ошибок при записи
import os
logs_dir = BASE_DIR / 'logs'
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)  # Создаем папку logs для хранения файлов логов
