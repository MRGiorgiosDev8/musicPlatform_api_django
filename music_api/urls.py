from django.urls import path
from django.views.generic import TemplateView
from .views.tracks_async import TrackSearchAPIView, YearChartAPIView
from .views.artists_async import TrendingArtistsAPIView

urlpatterns = [
    path('', TemplateView.as_view(template_name='home.html'), name='home'),
    path('search/', TrackSearchAPIView.as_view(), name='track_search'),
    path('trending/', TrendingArtistsAPIView.as_view(), name='trending_artists'),
    path('year-chart/', YearChartAPIView.as_view(), name='year-chart'),
]