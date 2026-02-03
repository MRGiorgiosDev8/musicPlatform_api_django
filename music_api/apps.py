from django.apps import AppConfig
import asyncio
import atexit
import logging

logger = logging.getLogger(__name__)


class MusicApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'music_api'

    def ready(self):
        try:
            from .services_async import http_client
        except Exception as e:
            logger.warning("http_client is not available on app startup: %s", e)
            return

        @atexit.register
        def shutdown_http_client():
            try:
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                loop.run_until_complete(http_client.aclose())

                logger.info("Global httpx.AsyncClient closed successfully")

            except Exception as e:
                logger.warning("Failed to close httpx.AsyncClient: %s", e)