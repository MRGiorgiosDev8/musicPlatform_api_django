from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "music_api",
            "0009_rename_music_api_p_playlis_7b2262_idx_music_api_p_playlis_b840e6_idx_and_more",
        ),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="playlistcomment",
            name="reply_to_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="playlist_comment_replies_to_me",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
