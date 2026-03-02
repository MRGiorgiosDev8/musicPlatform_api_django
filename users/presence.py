from django.core.cache import cache

PRESENCE_CONNECTIONS_KEY = "ws_presence_user_{user_id}_connections"


def _presence_key(user_id: int) -> str:
    return PRESENCE_CONNECTIONS_KEY.format(user_id=user_id)


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
