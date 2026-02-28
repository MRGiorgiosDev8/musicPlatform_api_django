document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('artistBioModal');
  const titleElement = document.getElementById('artistBioModalTitle');
  const loadingElement = document.getElementById('artistBioLoading');
  const contentElement = document.getElementById('artistBioContent');
  const imageWrap = document.getElementById('artistBioImageWrap');
  const imageElement = document.getElementById('artistBioImage');

  const modal = (
    modalElement &&
    typeof bootstrap !== 'undefined' &&
    typeof bootstrap.Modal === 'function'
  ) ? new bootstrap.Modal(modalElement) : null;

  if (!modal) return;

  const cache = new Map();
  const queue = new Map();
  let flushTimer = null;

  const normalizeKey = (artistName) => String(artistName || '').trim().toLowerCase();
  const fallbackPayload = (artistName) => ({
    bio: '',
    title: artistName,
    source_url: '',
    image_url: '',
    lang: '',
  });

  const renderModalPayload = (artistName, payload) => {
    const safeArtistName = String(artistName || '').trim() || 'Unknown artist';
    const bio = String(payload?.bio || '').trim();
    const imageUrl = String(payload?.image_url || '').trim();

    titleElement.textContent = safeArtistName;
    contentElement.textContent = bio || 'Биография для этого артиста не найдена.';
    loadingElement.hidden = true;

    imageWrap.hidden = !imageUrl;
    if (imageUrl) {
      imageElement.src = imageUrl;
      imageElement.alt = safeArtistName;
    } else {
      imageElement.removeAttribute('src');
      imageElement.alt = '';
    }
  };

  const fetchArtistBatch = async (artistNames) => {
    const headers = (typeof window.buildAuthHeaders === 'function')
      ? window.buildAuthHeaders(true, true)
      : { 'Content-Type': 'application/json' };

    const response = await fetch('/api/wikipedia/artists/', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ artists: artistNames, lang: 'ru' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    const artists = payload?.artists && typeof payload.artists === 'object' ? payload.artists : {};
    artistNames.forEach((artistName) => {
      cache.set(normalizeKey(artistName), artists[artistName] || fallbackPayload(artistName));
    });
  };

  const flushQueue = async () => {
    flushTimer = null;
    const queueEntries = Array.from(queue.entries());
    queue.clear();
    if (!queueEntries.length) return;

    const artistNames = queueEntries.map(([, item]) => item.artistName);
    try {
      await fetchArtistBatch(artistNames);
    } catch (error) {
      console.error('Wikipedia batch request failed:', error);
    }

    queueEntries.forEach(([key, item]) => {
      const payload = cache.get(key) || fallbackPayload(item.artistName);
      item.resolvers.forEach((resolve) => resolve(payload));
    });
  };

  const queueArtist = (artistName) => {
    const normalizedName = String(artistName || '').trim();
    if (!normalizedName) return Promise.resolve(fallbackPayload(''));
    const key = normalizeKey(normalizedName);
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const existing = queue.get(key);
      if (existing) {
        existing.resolvers.push(resolve);
      } else {
        queue.set(key, { artistName: normalizedName, resolvers: [resolve] });
      }

      if (!flushTimer) {
        flushTimer = window.setTimeout(() => {
          flushQueue().catch((error) => {
            console.error('Wikipedia queue flush failed:', error);
          });
        }, 80);
      }
    });
  };

  const prefetchVisibleArtists = () => {
    const artistNames = Array.from(document.querySelectorAll('.js-artist-bio-trigger[data-artist-name]'))
      .map((element) => String(element.dataset.artistName || '').trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(artistNames));
    if (!uniqueNames.length) return;

    const missing = uniqueNames.filter((artist) => !cache.has(normalizeKey(artist)));
    if (!missing.length) return;

    const chunkSize = 12;
    for (let i = 0; i < missing.length; i += chunkSize) {
      const chunk = missing.slice(i, i + chunkSize);
      fetchArtistBatch(chunk).catch((error) => {
        console.error('Wikipedia prefetch failed:', error);
      });
    }
  };

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('.js-artist-bio-trigger[data-artist-name]');
    if (!trigger) return;

    const artistName = String(trigger.dataset.artistName || '').trim();
    if (!artistName) return;

    event.preventDefault();
    loadingElement.hidden = false;
    imageWrap.hidden = true;
    contentElement.textContent = '';
    titleElement.textContent = artistName;
    modal.show();

    const payload = await queueArtist(artistName);
    renderModalPayload(artistName, payload);
  });

  window.setTimeout(prefetchVisibleArtists, 300);
  document.addEventListener('trending:rendered', () => window.setTimeout(prefetchVisibleArtists, 100));
  document.addEventListener('year2025:rendered', () => window.setTimeout(prefetchVisibleArtists, 100));
  document.addEventListener('publicPlaylist:rendered', () => window.setTimeout(prefetchVisibleArtists, 100));
});
