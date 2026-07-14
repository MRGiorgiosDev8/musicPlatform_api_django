from __future__ import annotations

import logging
import os
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from django.conf import settings
from django.db import connections
from django.utils import timezone


class DatabaseBackupError(RuntimeError):
    pass


@dataclass(frozen=True)
class BackupFileInfo:
    name: str
    path: Path
    size_bytes: int
    modified_at: datetime

    @property
    def size_mb(self) -> float:
        return self.size_bytes / (1024 * 1024)


def _get_backup_dir() -> Path:
    return Path(settings.BACKUP_DIR)


def _build_pg_command(binary_name: str) -> list[str]:
    database = settings.DATABASES["default"]
    engine = database.get("ENGINE", "")

    if "postgresql" not in engine:
        raise DatabaseBackupError("Backup is available only for PostgreSQL databases.")

    binary = shutil.which(binary_name)
    if not binary:
        raise DatabaseBackupError(
            f"{binary_name} is not installed. "
            "Install the PostgreSQL client in the runtime."
        )

    if not database.get("NAME"):
        raise DatabaseBackupError("Database name is not configured.")

    host = database.get("HOST") or "localhost"
    port = str(database.get("PORT") or "5432")
    user = database.get("USER") or ""

    return [
        binary,
        "-h",
        str(host),
        "-p",
        port,
        "-U",
        str(user),
    ]


def _build_pg_dump_command() -> list[str]:
    return [
        *_build_pg_command("pg_dump"),
        "-d",
        str(settings.DATABASES["default"].get("NAME") or ""),
        "-Fc",
        "--no-owner",
        "--no-privileges",
    ]


def _build_pg_restore_command() -> list[str]:
    return [
        *_build_pg_command("pg_restore"),
        "-d",
        str(settings.DATABASES["default"].get("NAME") or ""),
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
    ]


def _build_pg_env() -> dict[str, str]:
    env = os.environ.copy()
    password = settings.DATABASES["default"].get("PASSWORD")
    if password:
        env["PGPASSWORD"] = str(password)
    return env


def list_backup_files() -> list[BackupFileInfo]:
    backup_dir = _get_backup_dir()
    backup_dir.mkdir(parents=True, exist_ok=True)

    backups: list[BackupFileInfo] = []
    for path in backup_dir.glob("*.dump"):
        if not path.is_file():
            continue
        stat = path.stat()
        backups.append(
            BackupFileInfo(
                name=path.name,
                path=path,
                size_bytes=stat.st_size,
                modified_at=timezone.localtime(
                    datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.get_current_timezone()
                    )
                ),
            )
        )

    backups.sort(key=lambda item: item.modified_at, reverse=True)
    return backups


def get_latest_backup() -> BackupFileInfo | None:
    backups = list_backup_files()
    return backups[0] if backups else None


def _get_keep_count(keep_count: int | None = None) -> int:
    if keep_count is None:
        keep_count = int(getattr(settings, "BACKUP_KEEP_COUNT", 10))

    if keep_count < 0:
        raise DatabaseBackupError("BACKUP_KEEP_COUNT must be >= 0.")

    return keep_count


def delete_backup_file(filename: str) -> Path:
    backup_path = resolve_backup_path(filename)
    backup_path.unlink(missing_ok=True)
    return backup_path


def cleanup_old_backup_files(
    keep_count: int | None = None, protect_names: Iterable[str] | None = None
) -> list[Path]:
    keep_count = _get_keep_count(keep_count)
    protected = set(protect_names or ())
    backups = list_backup_files()

    kept_names = {item.name for item in backups[:keep_count]}
    deleted: list[Path] = []

    for item in backups:
        if item.name in kept_names or item.name in protected:
            continue

        item.path.unlink(missing_ok=True)
        deleted.append(item.path)

    return deleted


def resolve_backup_path(filename: str) -> Path:
    backup_dir = _get_backup_dir().resolve()
    candidate = (backup_dir / filename).resolve()

    if backup_dir not in candidate.parents and candidate != backup_dir:
        raise DatabaseBackupError("Invalid backup file path.")

    if candidate.suffix != ".dump" or not candidate.exists():
        raise DatabaseBackupError("Backup file not found.")

    return candidate


def create_database_backup() -> Path:
    backup_dir = _get_backup_dir()
    backup_dir.mkdir(parents=True, exist_ok=True)

    database = settings.DATABASES["default"]
    database_name = database.get("NAME") or "database"
    timestamp = timezone.localtime(timezone.now()).strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"{database_name}_{timestamp}.dump"

    command = _build_pg_dump_command()
    env = _build_pg_env()

    try:
        with backup_path.open("wb") as backup_file:
            subprocess.run(
                command,
                check=True,
                stdout=backup_file,
                stderr=subprocess.PIPE,
                env=env,
            )
    except Exception:
        if backup_path.exists():
            backup_path.unlink(missing_ok=True)
        raise

    cleanup_old_backup_files(protect_names=[backup_path.name])

    return backup_path


def restore_database_backup(backup_file: Path) -> None:
    command = _build_pg_restore_command()
    env = _build_pg_env()

    connections.close_all()
    try:
        subprocess.run(
            [*command, str(backup_file)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
    except subprocess.CalledProcessError as exc:
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            raise DatabaseBackupError(
                "Restore command failed and database connectivity check did not pass."
            ) from exc

        logger = logging.getLogger(__name__)
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace").strip()
        logger.warning(
            "pg_restore returned non-zero exit code but database is "
            "reachable after restore: %s",
            stderr or exc,
        )
