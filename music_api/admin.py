from django.contrib import admin

from .models import Playlist


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'created_at')
    search_fields = ('title', 'user__username', 'user__email')
    list_select_related = ('user',)
