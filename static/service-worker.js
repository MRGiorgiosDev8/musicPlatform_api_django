const CACHE_VERSION = 'rubysound-static-v2';
const OFFLINE_URL = '/';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/static/images/musicheadphonelogo1.svg',
  '/static/images/ruby-touch.png',
  '/static/vendor/bootstrap/css/bootstrap.min.css',
  '/static/css/global.css',
  '/static/css/base.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/vendor/gsap/gsap.min.js',
  '/static/vendor/bootstrap/js/bootstrap.bundle.min.js',
];

const NETWORK_ONLY_PATH_PREFIXES = [
  '/music_api/',
  '/api/',
  '/health/',
  '/ws/',
  '/media/',
  '/admin/',
  '/metrics',
];

const NETWORK_ONLY_HOSTS = [
  'audio.itunes.apple.com',
  'audio-ssl.itunes.apple.com',
  'preview.itunes.apple.com',
  'ws.audioscrobbler.com',
  'api.deezer.com',
  'cdn-images.dzcdn.net',
  'e-cdns-images.dzcdn.net',
  'is1-ssl.mzstatic.com',
  'is2-ssl.mzstatic.com',
  'is3-ssl.mzstatic.com',
  'is4-ssl.mzstatic.com',
  'is5-ssl.mzstatic.com',
  'itunes.apple.com',
  'deezer.com',
  'dzcdn.net',
  'mzstatic.com',
  'wikipedia.org',
  'wikimedia.org',
];

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|wav|flac|opus|webm)(\?|$)/i;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNetworkOnlyRequest(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return true;
  }

  if (request.destination === 'audio' || request.destination === 'video') {
    return true;
  }

  if (AUDIO_EXTENSIONS.test(url.pathname)) {
    return true;
  }

  if (url.pathname.includes('audio-proxy') || url.pathname.includes('audio_proxy')) {
    return true;
  }

  if (isSameOrigin(url)) {
    if (NETWORK_ONLY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return true;
    }
  }

  const hostname = url.hostname.toLowerCase();
  if (
    NETWORK_ONLY_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    )
  ) {
    return true;
  }

  return false;
}

function isCacheFirstCandidate(request) {
  const url = new URL(request.url);

  if (!isSameOrigin(url)) {
    return false;
  }

  if (request.mode === 'navigate') {
    return true;
  }

  if (url.pathname.startsWith('/static/')) {
    return true;
  }

  return false;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);

  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && request.mode !== 'navigate') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Фоллбек на случай полной потери сети (офлайн режим)
    if (request.mode === 'navigate') {
      const offlineFallback = await cache.match(OFFLINE_URL);
      if (offlineFallback) {
        return offlineFallback;
      }
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isNetworkOnlyRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isCacheFirstCandidate(request)) {
    event.respondWith(cacheFirst(request));
  }
});
