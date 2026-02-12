from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from asgiref.sync import sync_to_async


class AsyncJWTAuthentication(JWTAuthentication):
    """Асинхронная JWT аутентификация для ASGI"""
    
    async def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        
        try:
            # Используем sync_to_async для получения пользователя
            user = await sync_to_async(self.get_user)(validated_token)
            return (user, validated_token)
        except Exception:
            return None
