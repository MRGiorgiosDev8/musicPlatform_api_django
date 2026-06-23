from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@never_cache
@require_GET
def service_worker_view(request):
    sw_path = Path(settings.BASE_DIR) / "static" / "service-worker.js"
    if not sw_path.is_file():
        return HttpResponseNotFound("Service worker not found.")
    response = FileResponse(sw_path.open("rb"), content_type="application/javascript")
    response["Service-Worker-Allowed"] = "/"
    return response
