from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    GENDER_MALE = 'M'
    GENDER_FEMALE = 'F'
    GENDER_CHOICES = [
        (GENDER_MALE, 'Мужской'),
        (GENDER_FEMALE, 'Женский'),
    ]

    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    banner = models.ImageField(upload_to='banners/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    country = models.CharField(max_length=100, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    is_public_favorites = models.BooleanField(default=True)

    def __str__(self):
        return self.username
