from django.contrib import admin
from django.urls import path, include
from music_api import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('music_api/', include('music_api.urls')),
    path('', views.index, name='index'),
]
