from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from music_api.models import Playlist, PlaylistLike, PlaylistLikeNotification

User = get_user_model()


@receiver(post_save, sender=User)
def create_favorites_playlist(sender, instance, created, **kwargs):
    if created:
        Playlist.objects.get_or_create(
            user=instance,
            title='Favorites',
            defaults={'tracks': []},
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

    PlaylistLikeNotification.objects.create(
        recipient=recipient,
        actor=actor,
        playlist=playlist,
    )
