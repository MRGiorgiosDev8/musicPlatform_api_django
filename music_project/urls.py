from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from music_api.views.health import live_health_view, ready_health_view
from music_project.pwa_views import service_worker_view

urlpatterns = [
    path("", include("django_prometheus.urls")),
    path("service-worker.js", service_worker_view, name="service-worker"),
    path("health/live", live_health_view, name="health-live"),
    path("health/ready", ready_health_view, name="health-ready"),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("music_api/", include("music_api.urls")),
    path("api/", include("users.urls")),
    path("api/", include("music_api.api_urls")),
    path("", include("users.urls")),
    path("", TemplateView.as_view(template_name="home.html"), name="home"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif getattr(settings, "SERVE_MEDIA", False):
    media_prefix = settings.MEDIA_URL.lstrip("/")
    urlpatterns += [
        re_path(
            rf"^{media_prefix}(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        )
    ]
