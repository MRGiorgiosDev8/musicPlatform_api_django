from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace

import pytest
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory

from music_api.admin import (
    _admin_backup_restore_view,
    _admin_backup_view,
    _build_backup_overview,
    _admin_backup_delete_view,
    _admin_backup_cleanup_view,
)
from music_api.services.db_backup import BackupFileInfo


def _request(method: str, user) -> object:
    factory = RequestFactory()
    request = (
        factory.post("/admin/backup/")
        if method == "POST"
        else factory.get("/admin/backup/")
    )
    request.user = user
    request.session = {}
    return request


def _user(**kwargs):
    defaults = {
        "is_superuser": False,
        "is_staff": True,
        "is_active": True,
        "pk": 1,
        "username": "admin",
        "get_username": lambda: "admin",
        "has_perm": lambda perm, obj=None: True,
        "has_module_perms": lambda app_label: True,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _backup_info(name="music_platform_20260711-120000.dump", size_bytes=1024):
    return BackupFileInfo(
        name=name,
        path=SimpleNamespace(name=name),
        size_bytes=size_bytes,
        modified_at=datetime(2026, 7, 11, 12, 0, tzinfo=dt_timezone.utc),
    )


def test_build_backup_overview_uses_latest_backup(monkeypatch):
    backups = [_backup_info(), _backup_info("older.dump", 2048)]
    monkeypatch.setattr("music_api.admin.list_backup_files", lambda: backups)
    monkeypatch.setattr("music_api.admin.settings.BACKUP_KEEP_COUNT", 7, raising=False)

    overview = _build_backup_overview()

    assert overview["backup_count"] == 2
    assert overview["latest_backup"].name == backups[0].name
    assert overview["keep_count"] == 7


def test_admin_backup_view_blocks_non_superusers():
    request = _request("GET", _user(is_superuser=False, pk=10, username="staff"))

    with pytest.raises(PermissionDenied):
        _admin_backup_view(request)


def test_admin_backup_view_creates_backup_and_redirects(monkeypatch):
    from pathlib import Path

    backup_file = Path("/tmp/music_platform_20260711-120000.dump")
    backup_file.write_bytes(b"fake-dump")
    monkeypatch.setattr(
        "music_api.admin.create_database_backup",
        lambda: backup_file,
    )
    monkeypatch.setattr(
        "music_api.admin.messages.success", lambda *args, **kwargs: None
    )
    monkeypatch.setattr("music_api.admin.messages.error", lambda *args, **kwargs: None)
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})
    monkeypatch.setattr("music_api.admin.list_backup_files", lambda: [_backup_info()])

    request = _request("POST", _user(is_superuser=True, username="root"))

    response = _admin_backup_view(request)

    assert response.status_code == 302
    assert response["Location"] == "/admin/backup/"


def test_admin_backup_delete_view_deletes_file_and_redirects(monkeypatch):
    backup_info = _backup_info()
    monkeypatch.setattr(
        "music_api.admin.delete_backup_file", lambda filename: backup_info.path
    )
    monkeypatch.setattr(
        "music_api.admin.messages.success", lambda *args, **kwargs: None
    )
    monkeypatch.setattr("music_api.admin.messages.error", lambda *args, **kwargs: None)
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})

    request = _request("POST", _user(is_superuser=True, username="root"))

    response = _admin_backup_delete_view(request, backup_info.name)

    assert response.status_code == 302
    assert response["Location"] == "/admin/backup/"


def test_admin_backup_cleanup_view_deletes_old_files(monkeypatch):
    deleted = [SimpleNamespace(name="old1.dump"), SimpleNamespace(name="old2.dump")]
    monkeypatch.setattr(
        "music_api.admin.cleanup_old_backup_files",
        lambda: deleted,
    )
    monkeypatch.setattr(
        "music_api.admin.messages.success", lambda *args, **kwargs: None
    )
    monkeypatch.setattr("music_api.admin.messages.info", lambda *args, **kwargs: None)
    monkeypatch.setattr("music_api.admin.messages.error", lambda *args, **kwargs: None)
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})

    request = _request("POST", _user(is_superuser=True, username="root"))

    response = _admin_backup_cleanup_view(request)

    assert response.status_code == 302
    assert response["Location"] == "/admin/backup/"


def test_admin_restore_view_renders_confirmation(monkeypatch):
    backup_info = _backup_info()
    monkeypatch.setattr("music_api.admin.list_backup_files", lambda: [backup_info])
    monkeypatch.setattr(
        "music_api.admin.resolve_backup_path", lambda filename: backup_info.path
    )
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})

    request = _request("GET", _user(is_superuser=True, username="root"))

    response = _admin_backup_restore_view(request, backup_info.name)

    assert response.status_code == 200
    assert response.template_name == "admin/backup_restore.html"


def test_admin_restore_view_runs_restore_and_redirects(monkeypatch):
    backup_info = _backup_info()
    monkeypatch.setattr("music_api.admin.list_backup_files", lambda: [backup_info])
    monkeypatch.setattr(
        "music_api.admin.resolve_backup_path", lambda filename: backup_info.path
    )
    logout_calls = []
    monkeypatch.setattr(
        "music_api.admin.logout",
        lambda request: logout_calls.append(request),
    )
    monkeypatch.setattr("music_api.admin.restore_database_backup", lambda path: None)
    monkeypatch.setattr(
        "music_api.admin.messages.success", lambda *args, **kwargs: None
    )
    monkeypatch.setattr("music_api.admin.messages.error", lambda *args, **kwargs: None)
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})

    request = _request("POST", _user(is_superuser=True, username="root"))

    response = _admin_backup_restore_view(request, backup_info.name)

    assert response.status_code == 302
    assert response["Location"] == "/admin/login/?restored=1"
    assert logout_calls == [request]


def test_admin_restore_view_redirects_to_login_on_restore_error(monkeypatch):
    backup_info = _backup_info()
    monkeypatch.setattr("music_api.admin.list_backup_files", lambda: [backup_info])
    monkeypatch.setattr(
        "music_api.admin.resolve_backup_path", lambda filename: backup_info.path
    )
    logout_calls = []
    monkeypatch.setattr(
        "music_api.admin.logout",
        lambda request: logout_calls.append(request),
    )
    monkeypatch.setattr(
        "music_api.admin.restore_database_backup",
        lambda path: (_ for _ in ()).throw(RuntimeError("restore failed")),
    )
    monkeypatch.setattr("music_api.admin.admin.site.each_context", lambda request: {})

    request = _request("POST", _user(is_superuser=True, username="root"))

    response = _admin_backup_restore_view(request, backup_info.name)

    assert response.status_code == 302
    assert response["Location"] == "/admin/login/?restore_error=1"
    assert logout_calls == [request]
