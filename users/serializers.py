from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'avatar',
            'banner',
            'bio',
            'gender',
            'country',
            'birth_date',
            'is_public_favorites',
        )
        read_only_fields = ('id', 'username', 'email')
