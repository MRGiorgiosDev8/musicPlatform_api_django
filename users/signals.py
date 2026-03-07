from django.contrib.auth import get_user_model
from django.db.models.signals import post_delete, post_save
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
            "notification_id": notification.id,
            "actor_id": actor.pk,
            "actor_username": actor.username,
            "actor_profile_url": reverse("public_user_page", args=[actor.username]),
            "playlist_id": playlist.pk,
            "playlist_title": playlist.title,
            "created_at": timezone.localtime(notification.created_at).strftime(
                "%d.%m.%Y %H:%M"
            ),
            "message": f"{actor.username} поставил(а) лайк вашему плейлисту",
        },
    )


@receiver(post_delete, sender=PlaylistLike)
def remove_like_notification(sender, instance, **kwargs):
    actor_id = instance.user_id
    playlist_id = instance.playlist_id

    if not actor_id or not playlist_id:
        return

    notification = (
        PlaylistLikeNotification.objects.filter(
            actor_id=actor_id,
            playlist_id=playlist_id,
        )
        .order_by("-created_at")
        .first()
    )
    if not notification:
        return

    recipient_id = notification.recipient_id
    if not recipient_id or recipient_id == actor_id:
        return

    notification_id = notification.id
    notification.delete()

    send_user_notification(
        recipient_id,
        {
            "type": "playlist_like_removed",
            "notification_id": notification_id,
            "actor_id": actor_id,
            "playlist_id": playlist_id,
        },
    )
