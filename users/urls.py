from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    UserMeAPIView,
    CustomLoginView,
    signup_view,
    logout_view,
    profile_view,
    playlists_page_view,
    public_user_page_view,
)

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/me/', UserMeAPIView.as_view(), name='user_me'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('signup/', signup_view, name='signup'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('playlists/', playlists_page_view, name='playlists'),
    path('u/<str:username>/', public_user_page_view, name='public_user_page'),
]
