from django.urls import path

from .views.playlists_async import (
    PlaylistMeAPIView,
    PlaylistTrackAddAPIView,
    PublicFavoritesAPIView,
    PublicFavoritesLikeAPIView,
    PublicFavoritesTrendingAPIView,
)
from .views.wikipedia_async import WikipediaArtistBatchAPIView

urlpatterns = [
    path("playlists/me/", PlaylistMeAPIView.as_view(), name="playlist_me"),
    path(
        "playlists/me/tracks/",
        PlaylistTrackAddAPIView.as_view(),
        name="playlist_add_track",
    ),
    path(
        "playlists/public/trending/",
        PublicFavoritesTrendingAPIView.as_view(),
        name="playlist_public_trending",
    ),
    path(
        "playlists/public/<str:username>/",
        PublicFavoritesAPIView.as_view(),
        name="playlist_public_detail",
    ),
    path(
        "playlists/public/<str:username>/like/",
        PublicFavoritesLikeAPIView.as_view(),
        name="playlist_public_like",
    ),
    path(
        "wikipedia/artists/",
        WikipediaArtistBatchAPIView.as_view(),
        name="wikipedia_artists_api",
    ),
]
