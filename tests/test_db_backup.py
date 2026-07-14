from datetime import datetime, timezone as dt_timezone
from pathlib import Path
import subprocess

import pytest
from django.conf import settings
from django.test import override_settings

from music_api.services.db_backup import (
    DatabaseBackupError,
    cleanup_old_backup_files,
    create_database_backup,
    delete_backup_file,
    list_backup_files,
    resolve_backup_path,
    restore_database_backup,
)


@override_settings(BACKUP_DIR=Path("/tmp/test-db-backups"))
def test_create_database_backup_builds_pg_dump_command(monkeypatch, tmp_path):
    fixed_now = datetime(2026, 7, 11, 12, 0, 0, tzinfo=dt_timezone.utc)
    backup_dir = tmp_path / "backups"

    monkeypatch.setattr(
        "music_api.services.db_backup.timezone.now",
        lambda: fixed_now,
    )
    monkeypatch.setattr(
        "music_api.services.db_backup.shutil.which",
        lambda name: "/usr/bin/pg_dump" if name == "pg_dump" else None,
    )

    captured = {}

    def fake_run(command, check, stdout, stderr, env):
        captured["command"] = command
        captured["env"] = env
        stdout.write(b"fake-dump")
        return None

    cleanup_calls = []

    def fake_cleanup_old_backup_files(*, protect_names=None, keep_count=None):
        cleanup_calls.append(
            {
                "protect_names": list(protect_names or []),
                "keep_count": keep_count,
            }
        )
        return []

    monkeypatch.setattr("music_api.services.db_backup.subprocess.run", fake_run)
    monkeypatch.setattr(
        "music_api.services.db_backup.cleanup_old_backup_files",
        fake_cleanup_old_backup_files,
    )
    monkeypatch.setattr(settings, "BACKUP_DIR", backup_dir)

    backup_path = create_database_backup()

    assert (
        backup_path
        == backup_dir / f"{settings.DATABASES['default']['NAME']}_20260711-150000.dump"
    )
    assert backup_path.read_bytes() == b"fake-dump"
    assert captured["command"][0] == "/usr/bin/pg_dump"
    assert "-Fc" in captured["command"]
    password = settings.DATABASES["default"].get("PASSWORD")
    if password:
        assert captured["env"]["PGPASSWORD"] == password
    else:
        assert "PGPASSWORD" not in captured["env"]
    assert cleanup_calls == [{"protect_names": [backup_path.name], "keep_count": None}]


def test_create_database_backup_raises_when_pg_dump_missing(monkeypatch):
    monkeypatch.setattr("music_api.services.db_backup.shutil.which", lambda name: None)

    with pytest.raises(DatabaseBackupError, match="pg_dump is not installed"):
        create_database_backup()


def test_list_backup_files_sorts_by_most_recent_modified_time(tmp_path, monkeypatch):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    old_file = backup_dir / "old.dump"
    new_file = backup_dir / "new.dump"
    old_file.write_bytes(b"old")
    new_file.write_bytes(b"new")

    old_ts = 1_700_000_000
    new_ts = 1_800_000_000
    old_file.touch()
    new_file.touch()
    import os

    os.utime(old_file, (old_ts, old_ts))
    os.utime(new_file, (new_ts, new_ts))

    monkeypatch.setattr(settings, "BACKUP_DIR", backup_dir)

    backups = list_backup_files()

    assert [item.name for item in backups] == ["new.dump", "old.dump"]
    assert backups[0].size_bytes == 3


def test_cleanup_old_backup_files_keeps_newest_backups(tmp_path, monkeypatch):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    files = []
    for idx in range(3):
        path = backup_dir / f"file{idx}.dump"
        path.write_bytes(b"x")
        ts = 1_700_000_000 + idx
        import os

        os.utime(path, (ts, ts))
        files.append(path)

    monkeypatch.setattr(settings, "BACKUP_DIR", backup_dir)

    deleted = cleanup_old_backup_files(keep_count=1)

    assert [path.name for path in deleted] == ["file1.dump", "file0.dump"]
    assert files[2].exists()
    assert not files[1].exists()
    assert not files[0].exists()


def test_delete_backup_file_removes_target(tmp_path, monkeypatch):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    backup_file = backup_dir / "remove.dump"
    backup_file.write_bytes(b"delete me")

    monkeypatch.setattr(settings, "BACKUP_DIR", backup_dir)

    deleted = delete_backup_file("remove.dump")

    assert deleted == backup_file
    assert not backup_file.exists()


def test_resolve_backup_path_rejects_path_traversal(tmp_path, monkeypatch):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    monkeypatch.setattr(settings, "BACKUP_DIR", backup_dir)

    with pytest.raises(DatabaseBackupError, match="Invalid backup file path"):
        resolve_backup_path("../secrets.dump")


def test_restore_database_backup_builds_pg_restore_command(monkeypatch, tmp_path):
    backup_file = tmp_path / "restore.dump"
    backup_file.write_bytes(b"dump")

    monkeypatch.setattr(
        "music_api.services.db_backup.shutil.which",
        lambda name: "/usr/bin/pg_restore" if name == "pg_restore" else None,
    )

    captured = {}

    def fake_run(command, check, stdout, stderr, env):
        captured["command"] = command
        captured["env"] = env
        return None

    monkeypatch.setattr("music_api.services.db_backup.subprocess.run", fake_run)

    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql):
            self.sql = sql

        def fetchone(self):
            return (1,)

    class DummyConn:
        def cursor(self):
            return DummyCursor()

    class DummyConnections:
        def close_all(self):
            return None

        def __getitem__(self, alias):
            return DummyConn()

    monkeypatch.setattr("music_api.services.db_backup.connections", DummyConnections())

    restore_database_backup(backup_file)

    assert captured["command"][0] == "/usr/bin/pg_restore"
    assert "--clean" in captured["command"]
    assert str(backup_file) in captured["command"]


def test_restore_database_backup_treats_reachable_db_after_calledprocesserror_as_success(  # noqa: E501
    monkeypatch, tmp_path
):
    backup_file = tmp_path / "restore.dump"
    backup_file.write_bytes(b"dump")

    monkeypatch.setattr(
        "music_api.services.db_backup.shutil.which",
        lambda name: "/usr/bin/pg_restore" if name == "pg_restore" else None,
    )

    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql):
            self.sql = sql

        def fetchone(self):
            return (1,)

    class DummyConn:
        def cursor(self):
            return DummyCursor()

    class DummyConnections2:
        def close_all(self):
            return None

        def __getitem__(self, alias):
            return DummyConn()

    monkeypatch.setattr(
        "music_api.services.db_backup.connections",
        DummyConnections2(),
    )

    def fake_run(command, check, stdout, stderr, env):
        raise subprocess.CalledProcessError(1, command, output=b"", stderr=b"warning")

    monkeypatch.setattr("music_api.services.db_backup.subprocess.run", fake_run)

    restore_database_backup(backup_file)
