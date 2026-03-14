import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        view = context.get("view")
        logger.error("Unhandled exception in %s", view, exc_info=True)
        return Response(
            {"detail": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = response.data
    if isinstance(data, list):
        response.data = {"detail": data}
        return response

    if isinstance(data, dict) and "detail" in data:
        return response

    response.data = {"detail": data}
    return response
