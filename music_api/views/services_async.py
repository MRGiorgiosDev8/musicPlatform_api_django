import time
import asyncio
import httpx
import hashlib
from django.core.cache import cache
from .base import logger, LASTFM_KEY


def _safe_cache_key(prefix, *parts):
    raw = "|".join(str(p) for p in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:20]
    return f"{prefix}:{digest}"


def _build_http_client():
    return httpx.AsyncClient(
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        timeout=httpx.Timeout(7.0, connect=2.0),
    )


async def _get_itunes_batch_async(tracks):
    results = {}
    tracks = tracks[:25]
    itunes_sem = asyncio.Semaphore(3)

    async def fetch_track_data(track):
        name = track["name"]
        artist = track["artist"]
        cache_key = _safe_cache_key("itunes", artist.lower(), name.lower())
        cached = cache.get(cache_key)
        if cached is not None:
            return (name, artist), cached

        try:
            async with itunes_sem:
                await asyncio.sleep(0.1)
                r = await http_client.get(
                    "https://itunes.apple.com/search",
                    params={
                        "term": name,
                        "media": "music",
                        "entity": "song",
                        "attribute": "songTerm",
                        "limit": 5,
                    },
                )
                data = r.json()

                for item in data.get("results", []):
                    if (
                        item.get("trackName", "").lower() == name.lower()
                        and item.get("artistName", "").lower() == artist.lower()
                    ):
                        artwork_url = item.get("artworkUrl100")
                        if artwork_url:
                            artwork_url = artwork_url.replace("100x100bb", "600x600bb")
                        result = {
                            "cover": artwork_url,
                            "preview": item.get("previewUrl"),
                        }
                        cache.set(cache_key, result, 60 * 60 * 24 * 7)
                        return (name, artist), result

                empty = {"cover": None, "preview": None}
                cache.set(cache_key, empty, 60 * 60)
                return (name, artist), empty

        except Exception as e:
            logger.warning(
                f"iTunes API error for track='{name}', artist='{artist}': {e}"
            )
            empty = {"cover": None, "preview": None}
            cache.set(cache_key, empty, 60 * 30)
            return (name, artist), empty

    async with _build_http_client() as http_client:
        tasks = [fetch_track_data(track) for track in tracks]
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Собираем результаты
    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"iTunes batch fetch error: {result}")
            continue
        track_key, data = result
        results[track_key] = data

    return results


async def _get_deezer_batch_async(tracks):
    results = {}
    tracks = tracks[:40]
    deezer_sem = asyncio.Semaphore(15)

    async def fetch_track_data(track):
        name = track["name"]
        artist = track["artist"]
        cache_key = _safe_cache_key("deezer", artist.lower(), name.lower())
        cached = cache.get(cache_key)
        if cached is not None:
            return (name, artist), cached

        try:
            async with deezer_sem:
                r = await http_client.get(
                    "https://api.deezer.com/search",
                    params={"q": f'artist:"{artist}" track:"{name}"', "limit": 1},
                )
                data = r.json()

                if data.get("data") and len(data["data"]) > 0:
                    item = data["data"][0]
                    album = item.get("album", {})
                    result = {
                        "cover": album.get("cover_xl")
                        or album.get("cover_big")
                        or album.get("cover_medium"),
                        "preview": item.get("preview"),
                    }
                    cache.set(cache_key, result, 60 * 60 * 24 * 7)
                    return (name, artist), result

        except Exception as e:
            logger.warning(
                f"Deezer API error for track='{name}', artist='{artist}': {e}"
            )

        empty = {"cover": None, "preview": None}
        cache.set(cache_key, empty, 60 * 30)
        return (name, artist), empty

    async with _build_http_client() as http_client:
        tasks = [fetch_track_data(track) for track in tracks]
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Deezer batch fetch error: {result}")
            continue
        track_key, data = result
        results[track_key] = data

    return results


async def _get_lastfm_tracks_chart_async(limit=30):
    try:
        start_time = time.time()
        async with _build_http_client() as http_client:
            r = await http_client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "chart.gettoptracks",
                    "api_key": LASTFM_KEY,
                    "format": "json",
                    "limit": limit,
                },
            )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm tracks chart API request took %.2f ms", elapsed)

        r.raise_for_status()
        tracks = r.json().get("tracks", {}).get("track", [])

        for track in tracks:
            track["listeners"] = int(track.get("listeners", 0))
            track["playcount"] = int(track.get("playcount", 0))

        return tracks

    except Exception as e:
        logger.warning("Last.fm tracks chart error: %s", str(e), exc_info=True)
        return []


async def _get_lastfm_tracks_by_genre_async(genre, limit=30):
    try:
        lastfm_sem = asyncio.Semaphore(5)
        async with _build_http_client() as http_client:
            r = await http_client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "tag.gettoptracks",
                    "tag": genre,
                    "api_key": LASTFM_KEY,
                    "format": "json",
                    "limit": limit,
                },
            )
            r.raise_for_status()
            response_data = r.json()
            tracks = response_data.get("tracks", {}).get("track", [])

            async def fetch_track_info(track, client):
                try:
                    artist_name = (track.get("artist") or {}).get("name")
                    track_name = track.get("name")
                    cache_key = _safe_cache_key(
                        "lastfm_track_info",
                        (artist_name or "").lower(),
                        (track_name or "").lower(),
                    )
                    cached = cache.get(cache_key)
                    if isinstance(cached, dict):
                        track["listeners"] = int(cached.get("listeners", 0))
                        track["playcount"] = int(cached.get("playcount", 0))
                        return track

                    async with lastfm_sem:
                        info_response = await client.get(
                            "https://ws.audioscrobbler.com/2.0/",
                            params={
                                "method": "track.getInfo",
                                "api_key": LASTFM_KEY,
                                "format": "json",
                                "track": track_name,
                                "artist": artist_name,
                                "autocorrect": 1,
                            },
                        )
                        info_response.raise_for_status()
                        track_info = info_response.json().get("track", {})

                        track["listeners"] = int(track_info.get("listeners", 0))
                        track["playcount"] = int(track_info.get("playcount", 0))

                        cache.set(
                            cache_key,
                            {
                                "listeners": track["listeners"],
                                "playcount": track["playcount"],
                            },
                            timeout=60 * 60 * 24 * 7,
                        )

                except Exception as e:
                    # ИСПРАВЛЕННАЯ СТРОКА 246 (РАЗБИТА ДЛЯ PEP8)
                    t_n = track.get("name")
                    a_n = track.get("artist", {}).get("name")
                    logger.warning(
                        f"Last.fm track info error for track='{t_n}', "
                        f"artist='{a_n}': {e}"
                    )
                    track["listeners"] = 0
                    track["playcount"] = 0

                    try:
                        artist_name = (track.get("artist") or {}).get("name")
                        track_name = track.get("name")
                        cache_key = _safe_cache_key(
                            "lastfm_track_info",
                            (artist_name or "").lower(),
                            (track_name or "").lower(),
                        )
                        cache.set(
                            cache_key, {"listeners": 0, "playcount": 0}, timeout=60 * 10
                        )
                    except Exception:
                        pass

                return track

            tasks = [fetch_track_info(track, http_client) for track in tracks]
            enriched_tracks = await asyncio.gather(*tasks, return_exceptions=True)

        return [track for track in enriched_tracks if not isinstance(track, Exception)]

    except Exception as e:
        logger.warning(
            "Last.fm genre tracks error for genre='%s': %s",
            genre,
            str(e),
            exc_info=True,
        )
        return []


async def _search_lastfm_tracks_async(query, limit=50):
    try:
        start_time = time.time()
        async with _build_http_client() as http_client:
            r = await http_client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "track.search",
                    "track": query,
                    "api_key": LASTFM_KEY,
                    "format": "json",
                    "limit": limit,
                },
            )
        elapsed = (time.time() - start_time) * 1000
        logger.info(
            "Last.fm track search API request took %.2f ms for query='%s'",
            elapsed,
            query,
        )

        r.raise_for_status()
        return r.json().get("results", {}).get("trackmatches", {}).get("track", [])

    except Exception as e:
        logger.warning(
            "Last.fm track search error for query='%s': %s",
            query,
            str(e),
            exc_info=True,
        )
        return []


async def _get_deezer_artists_batch_async(artist_names):
    results = {}
    artist_names = artist_names[:40]
    deezer_sem = asyncio.Semaphore(15)

    async def fetch_artist_photo(name):
        cache_key = _safe_cache_key("deezer_artist", name.lower())
        cached = cache.get(cache_key)
        if cached is not None:
            return name, cached

        try:
            async with deezer_sem:
                r = await http_client.get(
                    "https://api.deezer.com/search/artist",
                    params={"q": name, "limit": 1},
                )
                data = r.json()
                if data.get("data"):
                    art = data["data"][0]
                    photo = art.get("picture_xl") or art.get("picture_big")
                    cache.set(cache_key, photo, 60 * 60 * 24 * 7)
                    return name, photo
                else:
                    cache.set(cache_key, None, 60 * 60)
                    return name, None
        except Exception as e:
            logger.warning(f"Deezer artist API error for artist='{name}': {e}")
            cache.set(cache_key, None, 60 * 60)
            return name, None

    async with _build_http_client() as http_client:
        tasks = [fetch_artist_photo(name) for name in artist_names]
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Deezer artist fetch error: {result}")
            continue
        name, photo = result
        results[name] = photo

    return results


async def _get_lastfm_releases_batch_async(artists):
    results = {}
    artists = artists[:75]
    lastfm_sem = asyncio.Semaphore(5)

    async def fetch_artist_releases(art):
        name = art["name"]
        mbid = art.get("mbid", "")
        cache_key = _safe_cache_key("lastfm_releases", mbid or name.lower())
        cached = cache.get(cache_key)
        if cached is not None:
            return name, cached

        try:
            async with lastfm_sem:
                r = await http_client.get(
                    "https://ws.audioscrobbler.com/2.0/",
                    params={
                        "method": "artist.gettopalbums",
                        "artist": name,
                        "mbid": mbid,
                        "api_key": LASTFM_KEY,
                        "format": "json",
                        "limit": 3,
                    },
                )
                r.raise_for_status()
                response_data = r.json()
                albums = response_data.get("topalbums", {}).get("album", [])

                result = []
                for a in albums:
                    cover_url = "/static/images/default.svg"
                    images = a.get("image", [])
                    if images and isinstance(images, list) and len(images) > 0:
                        last_image = images[-1]
                        if isinstance(last_image, dict):
                            cover_url = last_image.get("#text", cover_url) or cover_url

                    result.append(
                        {
                            "title": a.get("name", ""),
                            "playcount": int(a.get("playcount", 0)),
                            "url": a.get("url", ""),
                            "cover": cover_url,
                        }
                    )
                cache.set(cache_key, result, 60 * 60 * 24 * 3)
                return name, result
        except Exception as e:
            logger.warning(f"Last.fm releases API error for artist='{name}': {e}")
            cache.set(cache_key, [], 60 * 60)
            return name, []

    async with _build_http_client() as http_client:
        tasks = [fetch_artist_releases(art) for art in artists]
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in completed_results:
        if isinstance(result, Exception):
            logger.error(f"Last.fm releases fetch error: {result}")
            continue
        name, releases = result
        results[name] = releases

    return results


async def _get_lastfm_artists_by_genre_async(genre, limit=30):
    try:
        start_time = time.time()
        async with _build_http_client() as http_client:
            r = await http_client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "tag.gettopartists",
                    "tag": genre,
                    "api_key": LASTFM_KEY,
                    "format": "json",
                    "limit": limit * 2,
                },
            )
        elapsed = (time.time() - start_time) * 1000
        logger.info(
            "Last.fm genre artists API request took %.2f ms for genre='%s'",
            elapsed,
            genre,
        )

        r.raise_for_status()
        artists = r.json()["topartists"]["artist"]

        for a in artists:
            a["listeners"] = int(a.get("listeners", 0))
            a["playcount"] = int(a.get("playcount", 0))

        artists.sort(key=lambda a: (a["listeners"], a["playcount"]), reverse=True)
        return artists[:limit]

    except Exception as e:
        logger.warning(
            "Last.fm genre artists error for genre='%s': %s",
            genre,
            str(e),
            exc_info=True,
        )
        return []


async def _get_lastfm_artists_chart_async(limit=30):
    try:
        start_time = time.time()
        async with _build_http_client() as http_client:
            r = await http_client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "chart.gettopartists",
                    "api_key": LASTFM_KEY,
                    "format": "json",
                    "limit": limit,
                },
            )
        elapsed = (time.time() - start_time) * 1000
        logger.info("Last.fm chart API request took %.2f ms", elapsed)

        r.raise_for_status()
        return r.json().get("artists", {}).get("artist", [])

    except Exception as e:
        logger.warning("Last.fm chart error: %s", str(e), exc_info=True)
        return []
