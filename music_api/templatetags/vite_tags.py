"""Template tags для подключения Vite-бандла фронтенда.

Читает `manifest.json`, который создаёт `vite build` (см. vite.config.ts:
build.outDir = static/frontend, manifest = true).

Логика:
- `{% vite_available %}` — есть ли собранный бандл (manifest найден).
- `{% vite_asset %}` — URL entry-чанка бандла (учитывает hashed-хранение
  WhiteNoise через staticfiles_storage).

Шаблон base.html использует эти теги как переключатель: при наличии бандла
подключается один `<script type="module">`, иначе рендерятся legacy script-теги
(fallback без запуска Vite-сборки, например в DEBUG).
"""

import json

from django import template
from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.cache import cache

register = template.Library()

# Имя входной точки = ключ в build.rollupOptions.input (vite.config.ts).
# В manifest.json ключ элемента — это src-путь модуля, а `name` — имя input-ключей,
# поэтому ищем по обоим.
_ENTRY_NAME = "bootstrap"
_ENTRY_SRC = "static/js/entry/bootstrap.js"

# Короткий TTL: пересобирать бандл удобно без перезапуска Django.
_MANIFEST_CACHE_KEY = "vite-manifest-bootstrap"
_MANIFEST_CACHE_TTL = 60 * 15


def _manifest_path():
    """Абсолютный путь к manifest.json Vite-сборки."""
    from django.conf import settings

    base_dir = getattr(settings, "BASE_DIR", None)
    if base_dir is None:
        return None
    return base_dir / "static" / "frontend" / ".vite" / "manifest.json"


def _manifest():
    """Возвращает содержимое manifest.json или None, если сборки нет."""
    cached = cache.get(_MANIFEST_CACHE_KEY)
    if cached is not None:
        return cached

    manifest = None
    manifest_path = _manifest_path()
    if manifest_path is not None and manifest_path.is_file():
        try:
            with manifest_path.open(encoding="utf-8") as fh:
                manifest = json.load(fh)
        except (json.JSONDecodeError, OSError):
            manifest = None

    if manifest is not None:
        cache.set(_MANIFEST_CACHE_KEY, manifest, _MANIFEST_CACHE_TTL)
    return manifest


def _find_entry(manifest):
    """Возвращает элемент manifest для входной точки бандла или None."""
    if not manifest:
        return None
    for key, entry in manifest.items():
        if entry.get("isEntry") and (
            entry.get("name") == _ENTRY_NAME or key == _ENTRY_SRC
        ):
            return entry
    return None


@register.simple_tag
def vite_available() -> bool:
    """True, если собранный Vite-бандл доступен (manifest с entry найден)."""
    return _find_entry(_manifest()) is not None


@register.simple_tag
def vite_asset() -> str:
    """URL entry-скрипта бандла или пустая строка, если сборки нет."""
    entry = _find_entry(_manifest())
    if entry is None:
        return ""
    relative_path = f"frontend/{entry['file']}"
    return staticfiles_storage.url(relative_path)