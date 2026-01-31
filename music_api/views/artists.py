from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache

# Сервисные функции для работы с внешними API (Last.fm, Deezer)
from .services import (
    _get_lastfm_artists_by_genre,
    _get_lastfm_chart,
    _get_deezer_artist_info,
    _lastfm_artist_releases
)

class TrendingArtistsAPIView(APIView):
    """API для получения трендовых артистов.
    Возвращает либо общий топ, либо по выбранному жанру.
    """

    def get(self, request):
        # Получаем параметр жанра из запроса
        genre = request.query_params.get('genre')
        cache_key = f"trending_artists:{genre or 'all'}"

        # Проверка кэша для ускорения ответа
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        try:
            # Получаем сырые данные с внешних сервисов
            if genre:
                artists_raw = _get_lastfm_artists_by_genre(genre, 16)
            else:
                artists_raw = _get_lastfm_chart(16)

            # Формируем ответ с дополнительными данными (фото, релизы)
            artists = []
            for art in artists_raw:
                name = art['name']
                artists.append({
                    'name': name,
                    'photo_url': _get_deezer_artist_info(name) or '/static/images/default.svg',
                    'listeners': art.get('listeners', 0),
                    'playcount': art.get('playcount', 0),
                    'releases': _lastfm_artist_releases(art.get('mbid', ''), name)
                })

            data = {'artists': artists}

            # Кэшируем результат на 10 минут
            cache.set(cache_key, data, timeout=60 * 10)

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            # Если что-то пошло не так — возвращаем ошибку с кодом 503
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )