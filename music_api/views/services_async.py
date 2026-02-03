import time
import asyncio
import httpx
from django.core.cache import cache
from .base import logger, LASTFM_KEY

http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
    timeout=httpx.Timeout(7.0, connect=2.0)
)

lastfm_sem = asyncio.Semaphore(5)
itunes_sem = asyncio.Semaphore(3)
deezer_sem = asyncio.Semaphore(15)

async def _get_itunes_batch_async(tracks):

    results = {}
    tracks = tracks[:25]
    
    async def fetch_track_data(track):
        name = track['name']
        artist = track['artist']
        cache_key = f"itunes:{artist.lower()}:{name.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return (name, artist), cached

        try:
            async with itunes_sem:
                await asyncio.sleep(0.1)
                
                r = await http_client.get(
                    'https://itunes.apple.com/search',
                    params={
                        'term': name,
                        'media': 'music',
                        'entity': 'song',
                        'attribute': 'songTerm',
                        'limit': 5
                    }
                )
                data = r.json()

                for item in data.get('results', []):
                    if (
                        item.get('trackName', '').lower() == name.lower()
                        and item.get('artistName', '').lower() == artist.lower()
                    ):
                        result = {
                            'cover': item['artworkUrl100'].replace('100x100bb', '600x600bb'),
                            'preview': item.get('previewUrl')
                        }
                        cache.set(cache_key, result, 60 * 60 * 24 * 7)
                        return (name, artist), result

                empty = {'cover': None, 'preview': None}
                cache.set(cache_key, empty, 60 * 60)
                return (name, artist), empty

        except Exception as e:
            logger.warning(f"iTunes API error for track='{name}', artist='{artist}': {str(e)}")
            empty = {'cover': None, 'preview': None}
            cache.set(cache_key, empty, 60 * 30)
            return (name, artist), empty

    tasks = [fetch_track_data(track) for track in tracks]
    completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Собираем результаты
    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"iTunes batch fetch error: {str(result)}")
            continue
        track_key, data = result
        results[track_key] = data

    return results


async def _get_deezer_batch_async(tracks):

    results = {}
    tracks = tracks[:40]
    
    async def fetch_track_data(track):
        name = track['name']
        artist = track['artist']
        cache_key = f"deezer:{artist.lower()}:{name.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return (name, artist), cached

        try:
            async with deezer_sem:
                r = await http_client.get(
                    'https://api.deezer.com/search',
                    params={'q': f'artist:"{artist}" track:"{name}"', 'limit': 1}
                )
                data = r.json()

                if data.get('data'):
                    item = data['data'][0]
                    album = item.get('album', {})
                    result = {
                        'cover': album.get('cover_xl') or album.get('cover_big') or album.get('cover_medium'),
                        'preview': item.get('preview')
                    }
                    cache.set(cache_key, result, 60 * 60 * 24 * 7)
                    return (name, artist), result

        except Exception as e:
            logger.warning(f"Deezer API error for track='{name}', artist='{artist}': {str(e)}")

        empty = {'cover': None, 'preview': None}
        cache.set(cache_key, empty, 60 * 30)
        return (name, artist), empty

    # Запускаем все запросы параллельно
    tasks = [fetch_track_data(track) for track in tracks]
    completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Собираем результаты
    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Deezer batch fetch error: {str(result)}")
            continue
        track_key, data = result
        results[track_key] = data

    return results


async def _get_lastfm_chart_async(limit=30):
    """Асинхронное получение глобального чарта треков (Last.fm)"""
    try:
        start_time = time.time()
        r = await http_client.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'chart.gettoptracks',
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            }
        )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm tracks chart API request took %.2f ms", elapsed)

        r.raise_for_status()
        return r.json()['tracks']['track']

    except Exception as e:
        logger.warning("Last.fm tracks chart error: %s", str(e), exc_info=True)
        return []


async def _get_lastfm_tracks_by_genre_async(genre, limit=30):
    """Асинхронное получение топ треков по жанру (Last.fm)"""
    try:
        start_time = time.time()
        r = await http_client.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'tag.gettoptracks',
                'tag': genre,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            }
        )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm genre tracks API request took %.2f ms for genre='%s'", elapsed, genre)

        r.raise_for_status()
        return r.json()['tracks']['track']

    except Exception as e:
        logger.warning("Last.fm genre tracks error for genre='%s': %s", genre, str(e), exc_info=True)
        return []


async def _search_lastfm_tracks_async(query, limit=50):
    """Асинхронный поиск треков на Last.fm"""
    try:
        start_time = time.time()
        r = await http_client.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'track.search',
                'track': query,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            }
        )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm track search API request took %.2f ms for query='%s'", elapsed, query)

        r.raise_for_status()
        return r.json().get('results', {}).get('trackmatches', {}).get('track', [])

    except Exception as e:
        logger.warning("Last.fm track search error for query='%s': %s", query, str(e), exc_info=True)
        return []

async def _get_deezer_artists_batch_async(artist_names):

    results = {}
    artist_names = artist_names[:40]
    
    async def fetch_artist_photo(name):
        cache_key = f"deezer_artist:{name.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return name, cached

        try:
            async with deezer_sem:
                r = await http_client.get(
                    'https://api.deezer.com/search/artist',
                    params={'q': name, 'limit': 1}
                )
                data = r.json()
                if data.get('data'):
                    art = data['data'][0]
                    photo = art.get('picture_xl') or art.get('picture_big')
                    cache.set(cache_key, photo, 60 * 60 * 24 * 7)
                    return name, photo
                else:
                    cache.set(cache_key, None, 60 * 60)
                    return name, None
        except Exception:
            cache.set(cache_key, None, 60 * 60)
            return name, None

    tasks = [fetch_artist_photo(name) for name in artist_names]
    completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Deezer artist fetch error: {str(result)}")
            continue
        name, photo = result
        results[name] = photo

    return results


async def _get_lastfm_releases_batch_async(artists):

    results = {}
    artists = artists[:75]
    
    async def fetch_artist_releases(art):
        name = art['name']
        mbid = art.get('mbid', '')
        cache_key = f"lastfm_releases:{mbid or name.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return name, cached

        try:
            # Используем семафор для контроля очереди к Last.fm (лояльный лимит)
            async with lastfm_sem:
                r = await http_client.get(
                    'https://ws.audioscrobbler.com/2.0/',
                    params={
                        'method': 'artist.gettopalbums',
                        'artist': name,
                        'mbid': mbid,
                        'api_key': LASTFM_KEY,
                        'format': 'json',
                        'limit': 3
                    }
                )
                r.raise_for_status()
                albums = r.json()['topalbums']['album']

                result = [
                    {
                        'title': a['name'],
                        'playcount': a.get('playcount', 0),
                        'url': a['url'],
                        'cover': a['image'][-1]['#text'] or '/static/images/default.svg'
                    }
                    for a in albums
                ]
                cache.set(cache_key, result, 60 * 60 * 24 * 3)
                return name, result
        except Exception:
            cache.set(cache_key, [], 60 * 60)
            return name, []

    # Запускаем все запросы параллельно
    tasks = [fetch_artist_releases(art) for art in artists]
    completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Собираем результаты
    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Last.fm releases fetch error: {str(result)}")
            continue
        name, releases = result
        results[name] = releases

    return results


async def _get_lastfm_artists_by_genre_async(genre, limit=30):
    """Асинхронное получение топ артистов по жанру (Last.fm)"""
    try:
        start_time = time.time()
        r = await http_client.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'tag.gettopartists',
                'tag': genre,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit * 2
            }
        )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm genre artists API request took %.2f ms for genre='%s'", elapsed, genre)

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


async def _get_lastfm_chart_async(limit=30):
    """Асинхронное получение глобального чарта артистов (Last.fm)"""
    try:
        start_time = time.time()
        r = await http_client.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'chart.gettopartists',
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            }
        )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm chart API request took %.2f ms", elapsed)

        r.raise_for_status()
        return r.json()['artists']['artist']

    except Exception as e:
        logger.warning("Last.fm chart error: %s", str(e), exc_info=True)
        return []
