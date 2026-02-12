from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from music_api.models import Playlist

User = get_user_model()


@receiver(post_save, sender=User)
def create_favorites_playlist(sender, instance, created, **kwargs):
    if created:
        Playlist.objects.get_or_create(
            user=instance,
            title='Favorites',
            defaults={'tracks': []},
        )
