from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('music_api/', include('music_api.urls')),
    path('api/', include('users.urls')),
    path('api/', include('music_api.api_urls')),
    path('', include('users.urls')),
    path('', TemplateView.as_view(template_name='home.html'), name='home'),
]