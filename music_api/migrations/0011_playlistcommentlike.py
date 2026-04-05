from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("music_api", "0010_playlistcomment_reply_to_user"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PlaylistCommentLike",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "comment",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="likes",
                        to="music_api.playlistcomment",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="liked_playlist_comments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="playlistcommentlike",
            constraint=models.UniqueConstraint(
                fields=("comment", "user"), name="unique_playlist_comment_like"
            ),
        ),
        migrations.AddIndex(
            model_name="playlistcommentlike",
            index=models.Index(
                fields=["comment"], name="music_api_pl_comment_a5f99f_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="playlistcommentlike",
            index=models.Index(fields=["user"], name="music_api_pl_user_id_58f694_idx"),
        ),
    ]
