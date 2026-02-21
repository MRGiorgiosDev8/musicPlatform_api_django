from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html_join, format_html

from .models import Playlist, PlaylistLike, PlaylistLikeNotification

admin.site.site_header = "RubySound Control Room"
admin.site.site_title = "RubySound Admin"
admin.site.index_title = "Music Aggregator Dashboard"


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    change_list_template = 'admin/music_api/playlist/change_list.html'
    list_display = ('id', 'user', 'title', 'tracks_count', 'created_at')
    search_fields = ('title', 'user__username', 'user__email')
    list_select_related = ('user',)
    readonly_fields = ('created_at', 'tracks_preview')

    def tracks_count(self, obj):
        tracks = obj.tracks if isinstance(obj.tracks, list) else []
        return len(tracks)

    tracks_count.short_description = 'Tracks'

    def tracks_preview(self, obj):
        tracks = obj.tracks if isinstance(obj.tracks, list) else []
        if not tracks:
            return 'No tracks'

        normalized = []
        for item in tracks:
            if not isinstance(item, dict):
                continue
            name = str(item.get('name', '')).strip()
            artist_raw = item.get('artist', '')
            artist = artist_raw.get('name', '') if isinstance(artist_raw, dict) else str(artist_raw or '').strip()
            if not name or not artist:
                continue
            normalized.append((name, artist))

        if not normalized:
            return 'No tracks'

        return format_html(
            '<div style="max-height: 280px; overflow:auto;">{}</div>',
            format_html_join(
                '',
                '<div><strong>{}</strong> <span style="opacity:.8;">- {}</span></div>',
                normalized,
            ),
        )

    tracks_preview.short_description = 'Tracks preview'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'tracks-report/',
                self.admin_site.admin_view(self.tracks_report_view),
                name='music_api_playlist_tracks_report',
            ),
        ]
        return custom_urls + urls

    def tracks_report_view(self, request):
        query = (request.GET.get('q') or '').strip().lower()
        rows_map = {}

        playlists = Playlist.objects.select_related('user').all().only(
            'id', 'tracks', 'user__id', 'user__username', 'user__email'
        )

        for playlist in playlists.iterator():
            tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
            username = playlist.user.username
            email = playlist.user.email or ''

            for item in tracks:
                if not isinstance(item, dict):
                    continue

                name = str(item.get('name', '')).strip()
                artist_raw = item.get('artist', '')
                artist = artist_raw.get('name', '') if isinstance(artist_raw, dict) else str(artist_raw or '').strip()

                if not name or not artist:
                    continue

                search_blob = f'{name} {artist} {username} {email}'.lower()
                if query and query not in search_blob:
                    continue

                key = (name.lower(), artist.lower())
                if key not in rows_map:
                    rows_map[key] = {
                        'name': name,
                        'artist': artist,
                        'users': {},
                        'total_adds': 0,
                    }

                rows_map[key]['total_adds'] += 1
                rows_map[key]['users'][playlist.user_id] = {
                    'id': playlist.user_id,
                    'username': username,
                    'email': email,
                }

        rows = []
        for item in rows_map.values():
            users = sorted(item['users'].values(), key=lambda u: (u['username'].lower(), u['id']))
            rows.append(
                {
                    'name': item['name'],
                    'artist': item['artist'],
                    'user_count': len(users),
                    'total_adds': item['total_adds'],
                    'users': users,
                }
            )

        rows.sort(key=lambda r: (-r['user_count'], -r['total_adds'], r['name'].lower(), r['artist'].lower()))

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'title': 'Tracks by Users',
            'rows': rows,
            'query': request.GET.get('q', '').strip(),
        }
        return TemplateResponse(request, 'admin/music_api/playlist/tracks_report.html', context)


@admin.register(PlaylistLike)
class PlaylistLikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'playlist', 'user', 'created_at')
    list_select_related = ('playlist', 'user')
    search_fields = ('playlist__title', 'playlist__user__username', 'user__username')


@admin.register(PlaylistLikeNotification)
class PlaylistLikeNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'actor', 'playlist', 'created_at')
    list_select_related = ('recipient', 'actor', 'playlist')
    search_fields = ('recipient__username', 'actor__username', 'playlist__title')
