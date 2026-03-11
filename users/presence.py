from datetime import datetime

from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

PRESENCE_CONNECTIONS_KEY = "ws_presence_user_{user_id}_connections"
PRESENCE_LAST_SEEN_KEY = "ws_presence_user_{user_id}_last_seen"


def _presence_key(user_id: int) -> str:
    return PRESENCE_CONNECTIONS_KEY.format(user_id=user_id)


def _last_seen_key(user_id: int) -> str:
    return PRESENCE_LAST_SEEN_KEY.format(user_id=user_id)


def _format_last_seen(dt):
    local_dt = timezone.localtime(dt) if dt else timezone.localtime(timezone.now())
    return f"Был(а): {local_dt.strftime('%d.%m %H:%M')}"


def increment_user_connections(user_id: int) -> bool:
    key = _presence_key(user_id)
    if cache.add(key, 1, timeout=None):
        return True

    try:
        cache.incr(key)
    except (ValueError, NotImplementedError):
        current = int(cache.get(key, 0) or 0)
        next_value = current + 1
        cache.set(key, next_value, timeout=None)
        return current == 0

    return False


def decrement_user_connections(user_id: int) -> bool:
    key = _presence_key(user_id)
    try:
        new_value = cache.decr(key)
    except (ValueError, NotImplementedError):
        current = int(cache.get(key, 0) or 0)
        if current <= 1:
            cache.delete(key)
            return current == 1
        cache.set(key, current - 1, timeout=None)
        return False

    if new_value <= 0:
        cache.delete(key)
        return True

    return False


def is_user_online(user_id: int) -> bool:
    value = cache.get(_presence_key(user_id), 0) or 0
    try:
        return int(value) > 0
    except (TypeError, ValueError):
        return False


def set_user_last_seen_now(user_id: int) -> str:
    now = timezone.now()
    iso = now.isoformat()
    cache.set(_last_seen_key(user_id), iso, timeout=None)
    return iso


def get_user_last_seen_iso(user_id: int):
    cached_value = cache.get(_last_seen_key(user_id))
    if cached_value:
        try:
            datetime.fromisoformat(str(cached_value))
            return str(cached_value)
        except (TypeError, ValueError):
            pass

    last_login = (
        User.objects.filter(id=user_id).values_list("last_login", flat=True).first()
    )
    if not last_login:
        return None
    return last_login.isoformat()


def get_user_last_seen_display(user_id: int) -> str:
    last_seen_iso = get_user_last_seen_iso(user_id)
    if not last_seen_iso:
        return _format_last_seen(None)
    try:
        return _format_last_seen(datetime.fromisoformat(str(last_seen_iso)))
    except (TypeError, ValueError):
        return _format_last_seen(None)
