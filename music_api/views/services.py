import requests
from .base import logger, LASTFM_KEY

def _get_itunes(track_name: str, artist_name: str, timeout: int = 7):
    """Получение обложки и preview трека из iTunes"""
    try:
        # Делаем запрос к API iTunes
        r = requests.get(
            'https://itunes.apple.com/search',
            params={
                'term': track_name,
                'media': 'music',
                'entity': 'song',
                'attribute': 'songTerm',
                'limit': 5
            },
            timeout=timeout
        )
        r.raise_for_status()
        data = r.json()

        # Находим точный трек по имени и артисту
        for item in data.get('results', []):
            if (
                item.get('trackName', '').lower() == track_name.lower()
                and item.get('artistName', '').lower() == artist_name.lower()
            ):
                return {
                    'cover': item['artworkUrl100'].replace('100x100bb', '600x600bb'),
                    'preview': item.get('previewUrl')
                }
        # Если не найдено, возвращаем пустой результат
        return {'cover': None, 'preview': None}
    except Exception as e:
        logger.warning(
            "iTunes API error for track='%s', artist='%s': %s",
            track_name, artist_name, str(e), exc_info=True
        )
        return {'cover': None, 'preview': None}


def _get_deezer_data(track_name, artist_name, timeout=7):
    """Получение обложки и preview трека из Deezer (fallback)"""
    try:
        # Делаем запрос к API Deezer
        r = requests.get(
            'https://api.deezer.com/search',
            params={'q': f'artist:"{artist_name}" track:"{track_name}"', 'limit': 1},
            timeout=timeout
        )
        data = r.json()

        # Берём первый результат, если есть
        if data.get('data'):
            item = data['data'][0]
            album = item.get('album', {})
            return {
                'cover': album.get('cover_xl') or album.get('cover_big') or album.get('cover_medium'),
                'preview': item.get('preview')
            }
    except Exception as e:
        logger.warning(
            "Deezer API error for track='%s', artist='%s': %s",
            track_name, artist_name, str(e), exc_info=True
        )
    return {'cover': None, 'preview': None}


def _get_lastfm_artists_by_genre(genre, limit=30):
    """Топ артистов по жанру (Last.fm)"""
    try:
        # Запрос к API Last.fm
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'tag.gettopartists',
                'tag': genre,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit * 2
            },
            timeout=7
        )
        r.raise_for_status()
        artists = r.json()['topartists']['artist']

        # Преобразуем числовые поля
        for a in artists:
            a['listeners'] = int(a.get('listeners', 0))
            a['playcount'] = int(a.get('playcount', 0))

        # Сортируем по популярности и обрезаем до нужного лимита
        artists.sort(key=lambda a: (a['listeners'], a['playcount']), reverse=True)
        return artists[:limit]

    except Exception as e:
        logger.warning("Last.fm genre artists error for genre='%s': %s", genre, str(e), exc_info=True)
        return []


def _get_lastfm_chart(limit=30):
    """Глобальный чарт артистов (Last.fm)"""
    try:
        # Запрос к глобальному топу Last.fm
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'chart.gettopartists',
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            },
            timeout=7
        )
        r.raise_for_status()
        return r.json()['artists']['artist']

    except Exception as e:
        logger.warning("Last.fm chart error: %s", str(e), exc_info=True)
        return []


def _get_deezer_artist_info(name):
    """Фото артиста из Deezer"""
    # Запрос к Deezer для получения фото
    r = requests.get(
        'https://api.deezer.com/search/artist',
        params={'q': name, 'limit': 1},
        timeout=7
    )
    data = r.json()
    if data.get('data'):
        art = data['data'][0]
        return art.get('picture_xl') or art.get('picture_big')
    return None


def _lastfm_artist_releases(mbid, name):
    """Топ релизы артиста (Last.fm)"""
    try:
        # Запрос топ-альбомов артиста
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'artist.gettopalbums',
                'artist': name,
                'mbid': mbid,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': 3
            },
            timeout=7
        )
        r.raise_for_status()
        albums = r.json()['topalbums']['album']

        # Формируем список альбомов с ключевыми полями
        return [
            {
                'title': a['name'],
                'playcount': a.get('playcount', 0),
                'url': a['url'],
                'cover': a['image'][-1]['#text'] or '/static/images/default.svg'
            }
            for a in albums
        ]
    except Exception:
        # Если ошибка сети/API, возвращаем пустой список
        return []