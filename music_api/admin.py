import logging
from types import MethodType

from django.contrib import admin
from django.contrib import messages
from django.contrib.auth import logout
from django.core.exceptions import PermissionDenied
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html_join, format_html

from .models import Playlist, PlaylistComment, PlaylistLike, PlaylistLikeNotification
from .services.db_backup import (
    DatabaseBackupError,
    cleanup_old_backup_files,
    delete_backup_file,
    create_database_backup,
    list_backup_files,
    resolve_backup_path,
    restore_database_backup,
)

logger = logging.getLogger(__name__)

admin.site.site_header = "RubySound Control Room"
admin.site.site_title = "RubySound Admin"
admin.site.index_title = "Music Aggregator Dashboard"

_original_admin_get_urls = admin.site.get_urls
_original_admin_index = admin.site.index


def _build_backup_overview():
    backups = list_backup_files()
    return {
        "backups": backups,
        "backup_count": len(backups),
        "latest_backup": backups[0] if backups else None,
        "keep_count": getattr(settings, "BACKUP_KEEP_COUNT", 10),
    }


def _admin_index_view(request, extra_context=None):
    context = {"backup_overview": _build_backup_overview()}
    if extra_context:
        context.update(extra_context)
    return _original_admin_index(request, extra_context=context)


def _admin_backup_view(request):
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can create database backups.")

    context = {
        **admin.site.each_context(request),
        "title": "Создание backup",
        **_build_backup_overview(),
    }

    if request.method == "POST":
        logger.info(
            "Database backup requested by superuser %s (id=%s)",
            request.user.get_username(),
            request.user.pk,
        )
        try:
            backup_path = create_database_backup()
        except DatabaseBackupError as exc:
            logger.warning(
                "Database backup failed for superuser %s (id=%s): %s",
                request.user.get_username(),
                request.user.pk,
                exc,
            )
            messages.error(request, str(exc))
        except Exception:
            logger.exception(
                "Unexpected error while creating backup for superuser %s (id=%s)",
                request.user.get_username(),
                request.user.pk,
            )
            messages.error(
                request, "Не удалось создать backup. Подробности смотрите в логах."
            )
        else:
            size_mb = backup_path.stat().st_size / (1024 * 1024)
            logger.info(
                "Database backup created by superuser %s (id=%s): %s (%.2f MB)",
                request.user.get_username(),
                request.user.pk,
                backup_path,
                size_mb,
            )
            messages.success(
                request,
                f"Backup создан: {backup_path.name} ({size_mb:.2f} MB)",
            )
            return HttpResponseRedirect(request.path)

    return TemplateResponse(request, "admin/backup.html", context)


def _admin_backup_delete_view(request, filename):
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can delete database backups.")

    if request.method != "POST":
        return HttpResponseRedirect(reverse("admin:music_api_db_backup"))

    try:
        backup_path = delete_backup_file(filename)
    except DatabaseBackupError as exc:
        messages.error(request, str(exc))
        return HttpResponseRedirect(reverse("admin:music_api_db_backup"))

    logger.info(
        "Backup deleted by superuser %s (id=%s): %s",
        request.user.get_username(),
        request.user.pk,
        backup_path,
    )
    messages.success(request, f"Backup удален: {backup_path.name}")
    return HttpResponseRedirect(reverse("admin:music_api_db_backup"))


def _admin_backup_cleanup_view(request):
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can clean database backups.")

    if request.method != "POST":
        return HttpResponseRedirect(reverse("admin:music_api_db_backup"))

    try:
        deleted = cleanup_old_backup_files()
    except DatabaseBackupError as exc:
        messages.error(request, str(exc))
        return HttpResponseRedirect(reverse("admin:music_api_db_backup"))

    logger.info(
        "Backup cleanup requested by superuser %s (id=%s): deleted=%s",
        request.user.get_username(),
        request.user.pk,
        [path.name for path in deleted],
    )
    if deleted:
        messages.success(
            request,
            f"Удалено старых backup-файлов: {len(deleted)}",
        )
    else:
        messages.info(request, "Удалять было нечего.")
    return HttpResponseRedirect(reverse("admin:music_api_db_backup"))


def _admin_backup_download_view(request, filename):
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can download database backups.")

    try:
        backup_path = resolve_backup_path(filename)
    except DatabaseBackupError as exc:
        messages.error(request, str(exc))
        raise Http404(str(exc)) from exc

    logger.info(
        "Backup download requested by superuser %s (id=%s): %s",
        request.user.get_username(),
        request.user.pk,
        backup_path,
    )
    return FileResponse(
        backup_path.open("rb"),
        as_attachment=True,
        filename=backup_path.name,
    )


def _admin_backup_restore_view(request, filename):
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can restore database backups.")

    user_username = request.user.get_username()
    user_pk = request.user.pk

    try:
        backup_path = resolve_backup_path(filename)
    except DatabaseBackupError as exc:
        messages.error(request, str(exc))
        return HttpResponseRedirect(reverse("admin:music_api_db_backup"))

    backups = list_backup_files()
    backup_info = next(
        (item for item in backups if item.name == backup_path.name), None
    )
    context = {
        **admin.site.each_context(request),
        "title": "Восстановление backup",
        "backup": backup_info,
    }

    if request.method == "POST":
        logout(request)
        logger.info(
            "Database restore requested by superuser %s (id=%s): %s",
            user_username,
            user_pk,
            backup_path,
        )
        try:
            restore_database_backup(backup_path)
        except DatabaseBackupError as exc:
            logger.warning(
                "Database restore failed for superuser %s (id=%s): %s",
                user_username,
                user_pk,
                exc,
            )
            return HttpResponseRedirect("/admin/login/?restore_error=1")
        except Exception:
            logger.exception(
                "Unexpected error while restoring backup for superuser %s (id=%s)",
                user_username,
                user_pk,
            )
            return HttpResponseRedirect("/admin/login/?restore_error=1")
        else:
            return HttpResponseRedirect("/admin/login/?restored=1")

    return TemplateResponse(request, "admin/backup_restore.html", context)


def _get_admin_urls():
    urls = _original_admin_get_urls()
    custom_urls = [
        path(
            "backup/",
            admin.site.admin_view(_admin_backup_view),
            name="music_api_db_backup",
        ),
        path(
            "backup/download/<str:filename>/",
            admin.site.admin_view(_admin_backup_download_view),
            name="music_api_db_backup_download",
        ),
        path(
            "backup/delete/<str:filename>/",
            admin.site.admin_view(_admin_backup_delete_view),
            name="music_api_db_backup_delete",
        ),
        path(
            "backup/cleanup/",
            admin.site.admin_view(_admin_backup_cleanup_view),
            name="music_api_db_backup_cleanup",
        ),
        path(
            "backup/restore/<str:filename>/",
            admin.site.admin_view(_admin_backup_restore_view),
            name="music_api_db_backup_restore",
        ),
    ]
    return custom_urls + urls


def _site_get_urls(self):
    return _get_admin_urls()


def _site_index(self, request, extra_context=None):
    return _admin_index_view(request, extra_context=extra_context)


admin.site.index = MethodType(_site_index, admin.site)
admin.site.get_urls = MethodType(_site_get_urls, admin.site)


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    change_list_template = "admin/music_api/playlist/change_list.html"
    list_display = ("id", "user", "title", "tracks_count", "created_at")
    search_fields = ("title", "user__username", "user__email")
    list_select_related = ("user",)
    readonly_fields = ("created_at", "tracks_preview")

    def tracks_count(self, obj):
        tracks = obj.tracks if isinstance(obj.tracks, list) else []
        return len(tracks)

    tracks_count.short_description = "Tracks"

    def tracks_preview(self, obj):
        tracks = obj.tracks if isinstance(obj.tracks, list) else []
        if not tracks:
            return "No tracks"

        normalized = []
        for item in tracks:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            artist_raw = item.get("artist", "")
            artist = (
                artist_raw.get("name", "")
                if isinstance(artist_raw, dict)
                else str(artist_raw or "").strip()
            )
            if not name or not artist:
                continue
            normalized.append((name, artist))

        if not normalized:
            return "No tracks"

        return format_html(
            '<div style="max-height: 280px; overflow:auto;">{}</div>',
            format_html_join(
                "",
                '<div><strong>{}</strong> <span style="opacity:.8;">- {}</span></div>',
                normalized,
            ),
        )

    tracks_preview.short_description = "Tracks preview"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "tracks-report/",
                self.admin_site.admin_view(self.tracks_report_view),
                name="music_api_playlist_tracks_report",
            ),
        ]
        return custom_urls + urls

    def tracks_report_view(self, request):
        query = (request.GET.get("q") or "").strip().lower()
        rows_map = {}

        playlists = (
            Playlist.objects.select_related("user")
            .all()
            .only("id", "tracks", "user__id", "user__username", "user__email")
        )

        for playlist in playlists.iterator():
            tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
            username = playlist.user.username
            email = playlist.user.email or ""

            for item in tracks:
                if not isinstance(item, dict):
                    continue

                name = str(item.get("name", "")).strip()
                artist_raw = item.get("artist", "")
                artist = (
                    artist_raw.get("name", "")
                    if isinstance(artist_raw, dict)
                    else str(artist_raw or "").strip()
                )

                if not name or not artist:
                    continue

                search_blob = f"{name} {artist} {username} {email}".lower()
                if query and query not in search_blob:
                    continue

                key = (name.lower(), artist.lower())
                if key not in rows_map:
                    rows_map[key] = {
                        "name": name,
                        "artist": artist,
                        "users": {},
                        "total_adds": 0,
                    }

                rows_map[key]["total_adds"] += 1
                rows_map[key]["users"][playlist.user_id] = {
                    "id": playlist.user_id,
                    "username": username,
                    "email": email,
                }

        rows = []
        for item in rows_map.values():
            users = sorted(
                item["users"].values(), key=lambda u: (u["username"].lower(), u["id"])
            )
            rows.append(
                {
                    "name": item["name"],
                    "artist": item["artist"],
                    "user_count": len(users),
                    "total_adds": item["total_adds"],
                    "users": users,
                }
            )

        rows.sort(
            key=lambda r: (
                -r["user_count"],
                -r["total_adds"],
                r["name"].lower(),
                r["artist"].lower(),
            )
        )

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Tracks by Users",
            "rows": rows,
            "query": request.GET.get("q", "").strip(),
        }
        return TemplateResponse(
            request, "admin/music_api/playlist/tracks_report.html", context
        )


@admin.register(PlaylistLike)
class PlaylistLikeAdmin(admin.ModelAdmin):
    list_display = ("id", "playlist", "user", "created_at")
    list_select_related = ("playlist", "user")
    search_fields = ("playlist__title", "playlist__user__username", "user__username")


@admin.register(PlaylistLikeNotification)
class PlaylistLikeNotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "actor", "playlist", "created_at")
    list_select_related = ("recipient", "actor", "playlist")
    search_fields = ("recipient__username", "actor__username", "playlist__title")


@admin.register(PlaylistComment)
class PlaylistCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "playlist", "parent", "author", "created_at")
    list_select_related = ("playlist", "parent", "author")
    search_fields = ("playlist__title", "playlist__user__username", "author__username")
