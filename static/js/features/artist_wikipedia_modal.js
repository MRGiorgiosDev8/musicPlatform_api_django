const normalizeArtistKey = (artistName) =>
  String(artistName || '')
    .trim()
    .toLowerCase();

const fallbackWikipediaPayload = (artistName) => ({
  bio: '',
  title: artistName,
  source_url: '',
  image_url: '',
  lang: '',
});

const createWikipediaArtistBatcher = ({
  endpoint = '/api/wikipedia/artists/',
  lang = 'ru',
  flushDelay = 80,
  fetchImpl = null,
  getHeaders = null,
  setTimer = null,
} = {}) => {
  const cache = new Map();
  const queue = new Map();
  let flushTimer = null;

  const fetchFn = fetchImpl || fetch;
  const resolveHeaders = () => {
    if (typeof getHeaders === 'function') {
      return getHeaders();
    }
    return typeof window.buildAuthHeaders === 'function'
      ? window.buildAuthHeaders(true, true)
      : { 'Content-Type': 'application/json' };
  };
  const scheduleTimer = setTimer || ((fn, delay) => window.setTimeout(fn, delay));

  const fetchArtistBatch = async (artistNames) => {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: resolveHeaders(),
      body: JSON.stringify({ artists: artistNames, lang }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    const artists = payload?.artists && typeof payload.artists === 'object' ? payload.artists : {};
    artistNames.forEach((artistName) => {
      cache.set(
        normalizeArtistKey(artistName),
        artists[artistName] || fallbackWikipediaPayload(artistName)
      );
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
      const payload = cache.get(key) || fallbackWikipediaPayload(item.artistName);
      item.resolvers.forEach((resolve) => resolve(payload));
    });
  };

  const queueArtist = (artistName) => {
    const normalizedName = String(artistName || '').trim();
    if (!normalizedName) return Promise.resolve(fallbackWikipediaPayload(''));
    const key = normalizeArtistKey(normalizedName);
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
        flushTimer = scheduleTimer(() => {
          flushQueue().catch((error) => {
            console.error('Wikipedia queue flush failed:', error);
          });
        }, flushDelay);
      }
    });
  };

  const prefetchMissing = (artistNames = [], chunkSize = 12) => {
    const normalizedNames = Array.from(
      new Set(artistNames.map((name) => String(name || '').trim()).filter(Boolean))
    );
    if (!normalizedNames.length) return;

    const missing = normalizedNames.filter((artist) => !cache.has(normalizeArtistKey(artist)));
    if (!missing.length) return;

    for (let i = 0; i < missing.length; i += chunkSize) {
      const chunk = missing.slice(i, i + chunkSize);
      fetchArtistBatch(chunk).catch((error) => {
        console.error('Wikipedia prefetch failed:', error);
      });
    }
  };

  return {
    cache,
    queue,
    fetchArtistBatch,
    flushQueue,
    queueArtist,
    prefetchMissing,
  };
};

const initArtistWikipediaModal = () => {
  const modalElement = document.getElementById('artistBioModal');
  const titleElement = document.getElementById('artistBioModalTitle');
  const loadingElement = document.getElementById('artistBioLoading');
  const contentElement = document.getElementById('artistBioContent');
  const imageWrap = document.getElementById('artistBioImageWrap');
  const imageElement = document.getElementById('artistBioImage');

  const modal =
    modalElement && typeof bootstrap !== 'undefined' && typeof bootstrap.Modal === 'function'
      ? new bootstrap.Modal(modalElement)
      : null;

  if (!modal) return;

  const batcher = createWikipediaArtistBatcher();

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

  const prefetchVisibleArtists = () => {
    const artistNames = Array.from(
      document.querySelectorAll('.js-artist-bio-trigger[data-artist-name]')
    )
      .map((element) => String(element.dataset.artistName || '').trim())
      .filter(Boolean);
    batcher.prefetchMissing(artistNames, 12);
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

    const payload = await batcher.queueArtist(artistName);
    renderModalPayload(artistName, payload);
  });

  window.setTimeout(prefetchVisibleArtists, 300);
  document.addEventListener('trending:rendered', () =>
    window.setTimeout(prefetchVisibleArtists, 100)
  );
  document.addEventListener('year2025:rendered', () =>
    window.setTimeout(prefetchVisibleArtists, 100)
  );
  document.addEventListener('publicPlaylist:rendered', () =>
    window.setTimeout(prefetchVisibleArtists, 100)
  );
};

document.addEventListener('DOMContentLoaded', initArtistWikipediaModal);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initArtistWikipediaModal,
    normalizeArtistKey,
    fallbackWikipediaPayload,
    createWikipediaArtistBatcher,
  };
}
