from django.urls import path

from .views.playlists_async import (
    PublicFavoritesCommentDetailAPIView,
    PublicFavoritesCommentLikeAPIView,
    PublicFavoritesCommentLikesListAPIView,
    PublicFavoritesCommentsAPIView,
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
        "playlists/public/<str:username>/comments/",
        PublicFavoritesCommentsAPIView.as_view(),
        name="playlist_public_comments",
    ),
    path(
        "playlists/public/<str:username>/comments/<int:comment_id>/",
        PublicFavoritesCommentDetailAPIView.as_view(),
        name="playlist_public_comment_detail",
    ),
    path(
        "playlists/public/<str:username>/comments/<int:comment_id>/like/",
        PublicFavoritesCommentLikeAPIView.as_view(),
        name="playlist_public_comment_like",
    ),
    path(
        "playlists/public/<str:username>/comments/<int:comment_id>/likes/",
        PublicFavoritesCommentLikesListAPIView.as_view(),
        name="playlist_public_comment_likes",
    ),
    path(
        "wikipedia/artists/",
        WikipediaArtistBatchAPIView.as_view(),
        name="wikipedia_artists_api",
    ),
]
