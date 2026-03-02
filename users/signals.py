from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils import timezone

from music_api.models import Playlist, PlaylistLike, PlaylistLikeNotification
from .ws import send_user_notification

User = get_user_model()


@receiver(post_save, sender=User)
def create_favorites_playlist(sender, instance, created, **kwargs):
    if created:
        Playlist.objects.get_or_create(
            user=instance,
            title="Favorites",
            defaults={"tracks": []},
        )


@receiver(post_save, sender=PlaylistLike)
def create_like_notification(sender, instance, created, **kwargs):
    if not created:
        return

    playlist = instance.playlist
    recipient = playlist.user
    actor = instance.user

    if not recipient or not actor:
        return
    if recipient.pk == actor.pk:
        return

    notification = PlaylistLikeNotification.objects.create(
        recipient=recipient,
        actor=actor,
        playlist=playlist,
    )

    send_user_notification(
        recipient.pk,
        {
            "type": "playlist_like",
            "actor_username": actor.username,
            "actor_profile_url": reverse("public_user_page", args=[actor.username]),
            "playlist_title": playlist.title,
            "created_at": timezone.localtime(notification.created_at).strftime(
                "%d.%m.%Y %H:%M"
            ),
            "message": f"{actor.username} поставил(а) лайк вашему плейлисту",
        },
    )
