from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('music_api/', include('music_api.urls')),
    path('api/', include('users.urls')),
    path('api/', include('music_api.api_urls')),
    path('', include('users.urls')),
    path('', TemplateView.as_view(template_name='home.html'), name='home'),
]
