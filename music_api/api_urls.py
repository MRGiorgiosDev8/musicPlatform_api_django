from django.urls import path

from .views.playlists_async import PlaylistMeAPIView, PlaylistTrackAddAPIView

urlpatterns = [
    path('playlists/me/', PlaylistMeAPIView.as_view(), name='playlist_me'),
    path('playlists/me/tracks/', PlaylistTrackAddAPIView.as_view(), name='playlist_add_track'),
]
