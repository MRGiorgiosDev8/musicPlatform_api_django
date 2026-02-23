from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Profile",
            {
                "fields": (
                    "avatar",
                    "banner",
                    "bio",
                    "gender",
                    "country",
                    "birth_date",
                    "is_public_favorites",
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Profile",
            {
                "fields": (
                    "avatar",
                    "banner",
                    "bio",
                    "gender",
                    "country",
                    "birth_date",
                    "is_public_favorites",
                )
            },
        ),
    )

    list_display = UserAdmin.list_display + (
        "gender",
        "country",
        "birth_date",
        "is_public_favorites",
    )
