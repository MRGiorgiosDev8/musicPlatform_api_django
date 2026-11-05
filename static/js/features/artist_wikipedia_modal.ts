/**
 * Модальное окно биографии артиста (Wikipedia).
 * Side-effect модуль: на DOMContentLoaded инициализирует модалку, слушает
 * клики по .js-artist-bio-trigger[data-artist-name] и события
 * trending:rendered / year2025:rendered / publicPlaylist:rendered.
 * CJS-мост сохранён (см. tests/js/helpers/artist_wikipedia_modal.js).
 */

interface WikipediaArtistPayload {
  bio: string;
  title: string;
  source_url: string;
  image_url: string;
  lang: string;
}

interface WikipediaQueueItem {
  artistName: string;
  resolvers: Array<(payload: WikipediaArtistPayload) => void>;
}

interface WikipediaArtistBatcher {
  cache: Map<string, WikipediaArtistPayload>;
  queue: Map<string, WikipediaQueueItem>;
  fetchArtistBatch: (artistNames: string[]) => Promise<void>;
  flushQueue: () => Promise<void>;
  queueArtist: (artistName: string) => Promise<WikipediaArtistPayload>;
  prefetchMissing: (artistNames?: string[], chunkSize?: number) => void;
}

interface WikipediaBatcherOptions {
  endpoint?: string;
  lang?: string;
  flushDelay?: number;
  fetchImpl?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null;
  getHeaders?: (() => Record<string, string>) | null;
  setTimer?: ((fn: () => void, delay: number) => number) | null;
}

const normalizeArtistKey = (artistName: string | null | undefined): string =>
  String(artistName || '')
    .trim()
    .toLowerCase();

const fallbackWikipediaPayload = (artistName: string): WikipediaArtistPayload => ({
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
}: WikipediaBatcherOptions = {}): WikipediaArtistBatcher => {
  const cache = new Map<string, WikipediaArtistPayload>();
  const queue = new Map<string, WikipediaQueueItem>();
  let flushTimer: number | null = null;

  const fetchFn = fetchImpl || fetch;
  const resolveHeaders = (): Record<string, string> => {
    if (typeof getHeaders === 'function') {
      return getHeaders();
    }
    return typeof window.buildAuthHeaders === 'function'
      ? window.buildAuthHeaders(true, true)
      : { 'Content-Type': 'application/json' };
  };
  const scheduleTimer = setTimer || ((fn, delay) => window.setTimeout(fn, delay));

  const fetchArtistBatch = async (artistNames: string[]): Promise<void> => {
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

    const artists: Record<string, WikipediaArtistPayload | undefined> =
      payload?.artists && typeof payload.artists === 'object' ? payload.artists : {};
    artistNames.forEach((artistName) => {
      cache.set(
        normalizeArtistKey(artistName),
        artists[artistName] || fallbackWikipediaPayload(artistName)
      );
    });
  };

  const flushQueue = async (): Promise<void> => {
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

  const queueArtist = (artistName: string): Promise<WikipediaArtistPayload> => {
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

  const prefetchMissing = (artistNames: string[] = [], chunkSize = 12): void => {
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

const initArtistWikipediaModal = (): void => {
  const modalElement = document.getElementById('artistBioModal');
  const titleElement = document.getElementById('artistBioModalTitle') as HTMLElement;
  const loadingElement = document.getElementById('artistBioLoading') as HTMLElement;
  const contentElement = document.getElementById('artistBioContent') as HTMLElement;
  const imageWrap = document.getElementById('artistBioImageWrap') as HTMLElement;
  const imageElement = document.getElementById('artistBioImage') as HTMLImageElement;

  const modal =
    modalElement && typeof bootstrap !== 'undefined' && typeof bootstrap.Modal === 'function'
      ? new bootstrap.Modal(modalElement)
      : null;

  if (!modal) return;

  const batcher = createWikipediaArtistBatcher();

  const renderImageWithPreload = (imageUrl: string, altText: string): Promise<boolean> =>
    new Promise((resolve) => {
      imageWrap.classList.remove('is-loaded');
      imageWrap.classList.add('is-loading');
      imageElement.removeAttribute('src');
      imageElement.alt = altText || '';

      if (!imageUrl) {
        imageWrap.classList.remove('is-loading');
        resolve(false);
        return;
      }

      const preloader = new window.Image();
      preloader.onload = () => {
        imageElement.src = imageUrl;
        imageElement.alt = altText || '';
        imageWrap.classList.remove('is-loading');
        requestAnimationFrame(() => {
          imageWrap.classList.add('is-loaded');
        });
        resolve(true);
      };
      preloader.onerror = () => {
        imageWrap.classList.remove('is-loading');
        imageWrap.classList.remove('is-loaded');
        imageElement.removeAttribute('src');
        imageElement.alt = '';
        resolve(false);
      };
      preloader.src = imageUrl;
    });

  const renderModalPayload = async (
    artistName: string,
    payload: WikipediaArtistPayload
  ): Promise<void> => {
    const safeArtistName = String(artistName || '').trim() || 'Unknown artist';
    const bio = String(payload?.bio || '').trim();
    const imageUrl = String(payload?.image_url || '').trim();

    titleElement.textContent = safeArtistName;
    contentElement.textContent = bio || 'Биография для этого артиста не найдена.';
    loadingElement.hidden = true;

    imageWrap.hidden = !imageUrl;
    if (!imageUrl) {
      imageWrap.classList.remove('is-loading', 'is-loaded');
      imageElement.removeAttribute('src');
      imageElement.alt = '';
      return;
    }

    await renderImageWithPreload(imageUrl, safeArtistName);
  };

  const animateModalLayersIn = (): void => {
    if (typeof gsap === 'undefined') return;
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

    const layers: HTMLElement[] = [];
    if (!imageWrap.hidden) layers.push(imageWrap);
    layers.push(titleElement, contentElement);

    gsap.killTweensOf(layers);
    gsap.set(layers, {
      autoAlpha: 0,
      y: isDarkTheme ? 14 : 10,
      filter: isDarkTheme ? 'blur(8px)' : 'blur(4px)',
    });

    gsap.to(layers, {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: isDarkTheme ? 0.28 : 0.22,
      ease: 'power2.out',
      stagger: isDarkTheme ? 0.2 : 0.18,
      overwrite: 'auto',
      clearProps: 'filter',
    });
  };

  const prefetchVisibleArtists = (): void => {
    const artistNames = Array.from(
      document.querySelectorAll<HTMLElement>('.js-artist-bio-trigger[data-artist-name]')
    )
      .map((element) => String(element.dataset.artistName || '').trim())
      .filter(Boolean);
    batcher.prefetchMissing(artistNames, 12);
  };

  document.addEventListener('click', async (event) => {
    const trigger = (event.target as Element | null)?.closest?.(
      '.js-artist-bio-trigger[data-artist-name]'
    );
    if (!trigger) return;

    const artistName = String((trigger as HTMLElement).dataset.artistName || '').trim();
    if (!artistName) return;

    event.preventDefault();
    loadingElement.hidden = false;
    imageWrap.hidden = true;
    imageWrap.classList.remove('is-loading', 'is-loaded');
    contentElement.textContent = '';
    titleElement.textContent = artistName;
    modal.show();

    const payload = await batcher.queueArtist(artistName);
    await renderModalPayload(artistName, payload);
    animateModalLayersIn();
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

export {};
