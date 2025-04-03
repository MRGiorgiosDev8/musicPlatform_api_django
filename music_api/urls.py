from django.urls import path
from . import views
from .views import TrackSearchAPIView

urlpatterns = [
    path('', views.index, name='index'),
    path('search/', TrackSearchAPIView.as_view(), name='track_search'),
]