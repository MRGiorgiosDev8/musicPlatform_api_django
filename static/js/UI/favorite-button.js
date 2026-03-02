const FAVORITES_ME_URL = '/api/playlists/me/';
const FAVORITES_TRACKS_URL = '/api/playlists/me/tracks/';

let favoritesLoaded = false;
let favoritesLoadPromise = null;
let favoritesKeySet = new Set();

const normalizeTrackValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();
const getTrackKey = (trackName, artistName) =>
  `${normalizeTrackValue(trackName)}::${normalizeTrackValue(artistName)}`;
const isLikelyMobileTouchDevice = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const ua = String(navigator.userAgent || '');
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return touchPoints > 0 || mobileUA;
};

function triggerHapticFeedback(pattern = 18) {
  if (!isLikelyMobileTouchDevice()) {
    return false;
  }

  if (isIOSDevice()) {
    try {
      if (window.TapticEngine) {
        window.TapticEngine.impact({ style: 'light' });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  return false;
}

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getCSRFToken() {
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken && metaToken !== 'NOTPROVIDED') {
    return metaToken;
  }

  const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
}

function getJWTToken() {
  const candidates = [
    localStorage.getItem('access'),
    localStorage.getItem('access_token'),
    localStorage.getItem('jwt_access'),
    localStorage.getItem('token'),
  ];
  return candidates.find(Boolean) || '';
}

function buildAuthHeaders(includeJsonContentType = false, includeCsrf = false) {
  const headers = {};
  const jwtToken = getJWTToken();
  const csrfToken = getCSRFToken();

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (jwtToken) {
    headers.Authorization = `Bearer ${jwtToken}`;
  }
  if (includeCsrf && csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  return headers;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function favoritesRequest(url, options = {}) {
  return fetch(url, {
    credentials: 'same-origin',
    ...options,
  });
}

function setButtonState(button, isFavorite) {
  button.className = isFavorite ? 'btn btn-danger btn-sm' : 'btn btn-outline-danger btn-sm';

  while (button.firstChild) {
    button.removeChild(button.firstChild);
  }

  const icon = document.createElement('i');
  icon.className = `bi bi-heart${isFavorite ? '-fill' : ''}`;
  button.appendChild(icon);

  button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
  button.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
}

async function ensureFavoritesLoaded() {
  if (favoritesLoaded) {
    return favoritesKeySet;
  }
  if (favoritesLoadPromise) {
    return favoritesLoadPromise;
  }

  favoritesLoadPromise = (async () => {
    const response = await favoritesRequest(FAVORITES_ME_URL, {
      method: 'GET',
      headers: buildAuthHeaders(false, false),
    });

    if (!response.ok) {
      const payload = await parseJsonSafe(response);
      throw new Error(payload.detail || `Failed to load favorites (${response.status})`);
    }

    const payload = await parseJsonSafe(response);
    const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
    favoritesKeySet = new Set(tracks.map((track) => getTrackKey(track?.name, track?.artist)));
    favoritesLoaded = true;
    favoritesLoadPromise = null;
    return favoritesKeySet;
  })().catch((error) => {
    favoritesLoadPromise = null;
    throw error;
  });

  return favoritesLoadPromise;
}

async function updateFavoriteStatus(trackName, artistName, shouldAdd, mbid = null) {
  const payload = { name: trackName, artist: artistName };
  if (mbid && String(mbid).trim()) {
    payload.mbid = String(mbid).trim();
  }
  const response = await favoritesRequest(FAVORITES_TRACKS_URL, {
    method: shouldAdd ? 'POST' : 'DELETE',
    headers: buildAuthHeaders(true, true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    const message = payload.detail || `Favorite request failed (${response.status})`;
    throw new Error(message);
  }

  return response;
}

function emitFavoriteToggled(trackName, artistName, isFavorite) {
  document.dispatchEvent(
    new CustomEvent('favoriteToggled', {
      detail: {
        trackName,
        artistName,
        isFavorite,
      },
    })
  );
}

function createFavoriteButton(trackName, artistName, isFavorite = false, mbid = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline-danger btn-sm';
  button.style.minWidth = '42px';
  button.setAttribute('aria-label', 'Toggle favorite');
  setButtonState(button, isFavorite);

  let currentState = Boolean(isFavorite);
  let isPending = false;
  const trackKey = getTrackKey(trackName, artistName);

  button.addEventListener('click', async () => {
    if (isPending) {
      return;
    }
    triggerHapticFeedback();
    isPending = true;
    button.disabled = true;

    const shouldAdd = !currentState;
    try {
      await updateFavoriteStatus(trackName, artistName, shouldAdd, mbid);
      currentState = shouldAdd;
      if (currentState) {
        favoritesKeySet.add(trackKey);
      } else {
        favoritesKeySet.delete(trackKey);
      }
      setButtonState(button, currentState);
      emitFavoriteToggled(trackName, artistName, currentState);
    } catch (error) {
      console.error('Failed to toggle favorite status:', error);
    } finally {
      isPending = false;
      button.disabled = false;
    }
  });

  return button;
}

async function isTrackFavorite(trackName, artistName) {
  try {
    const favorites = await ensureFavoritesLoaded();
    return favorites.has(getTrackKey(trackName, artistName));
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

async function createFavoriteButtonWithCheck(trackName, artistName, mbid = null) {
  const isFavorite = await isTrackFavorite(trackName, artistName);
  return createFavoriteButton(trackName, artistName, isFavorite, mbid);
}

function resetFavoritesCache() {
  favoritesLoaded = false;
  favoritesLoadPromise = null;
  favoritesKeySet = new Set();
}

if (typeof window !== 'undefined') {
  window.createFavoriteButtonWithCheck = createFavoriteButtonWithCheck;
  window.createFavoriteButton = createFavoriteButton;
  window.isTrackFavorite = isTrackFavorite;
  window.getCSRFToken = getCSRFToken;
  window.getJWTToken = getJWTToken;
  window.buildAuthHeaders = buildAuthHeaders;
  window.resetFavoritesCache = resetFavoritesCache;
  window.triggerHapticFeedback = triggerHapticFeedback;
  window.isIOSDevice = isIOSDevice;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createFavoriteButton,
    createFavoriteButtonWithCheck,
    isTrackFavorite,
    getCSRFToken,
    getJWTToken,
    buildAuthHeaders,
    resetFavoritesCache,
    triggerHapticFeedback,
    isIOSDevice,
  };
}
