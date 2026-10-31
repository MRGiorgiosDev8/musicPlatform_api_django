/**
 * Favorite-кнопка: добавление/удаление трека в избранное.
 *
 * Классический side-effect модуль: предоставляет API через window.*
 * (см. блок присваиваний внизу) и CJS-мост module.exports для CommonJS.
 * ESM-экспортов намеренно нет — поведение должно совпадать в Vite-бандле
 * и в сгенерированном legacy-IIFE.
 */
const FAVORITES_ME_URL = '/api/playlists/me/';
const FAVORITES_TRACKS_URL = '/api/playlists/me/tracks/';

let favoritesLoaded = false;
let favoritesLoadPromise: Promise<Set<string>> | null = null;
let favoritesKeySet = new Set<string>();

/**
 * Трек из payload списка избранного: поля опциональны, как в ответе API.
 */
interface FavoritesTrack {
  name?: string | null;
  artist?: string | null;
}

/**
 * Ответ /api/playlists/me/ — tracks и detail опциональны.
 */
interface FavoritesResponse {
  detail?: string;
  tracks?: FavoritesTrack[];
}

type AuthHeaders = Record<string, string>;

/**
 * Внешний iOS-глобал TapticEngine (загружается сторонним скриптом вне
 * нашей типизации). Тип локальный — только те методы, что используются.
 */
interface TapticEngineApi {
  impact(options: { style: string }): void;
}

const normalizeTrackValue = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase();

const getTrackKey = (trackName: unknown, artistName: unknown): string =>
  `${normalizeTrackValue(trackName)}::${normalizeTrackValue(artistName)}`;

const isLikelyMobileTouchDevice = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const ua = String(navigator.userAgent || '');
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return touchPoints > 0 || mobileUA;
};

function triggerHapticFeedback(pattern = 18): boolean {
  if (!isLikelyMobileTouchDevice()) {
    return false;
  }

  if (isIOSDevice()) {
    try {
      const tapticEngine = (window as unknown as { TapticEngine?: TapticEngineApi }).TapticEngine;
      if (tapticEngine) {
        tapticEngine.impact({ style: 'light' });
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

function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getCSRFToken(): string {
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken && metaToken !== 'NOTPROVIDED') {
    return metaToken;
  }

  const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
}

function getJWTToken(): string {
  const candidates = [
    localStorage.getItem('access'),
    localStorage.getItem('access_token'),
    localStorage.getItem('jwt_access'),
    localStorage.getItem('token'),
  ];
  return candidates.find(Boolean) || '';
}

function buildAuthHeaders(includeJsonContentType = false, includeCsrf = false): AuthHeaders {
  const headers: AuthHeaders = {};
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

async function parseJsonSafe<T = Record<string, unknown>>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

async function favoritesRequest(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    credentials: 'same-origin',
    ...options,
  });
}

function setButtonState(button: HTMLButtonElement, isFavorite: boolean): void {
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

async function ensureFavoritesLoaded(): Promise<Set<string>> {
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
      const payload = await parseJsonSafe<FavoritesResponse>(response);
      throw new Error(payload.detail || `Failed to load favorites (${response.status})`);
    }

    const payload = await parseJsonSafe<FavoritesResponse>(response);
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

async function updateFavoriteStatus(
  trackName: string,
  artistName: string,
  shouldAdd: boolean,
  mbid: string | null = null
): Promise<Response> {
  const payload: { name: string; artist: string; mbid?: string } = {
    name: trackName,
    artist: artistName,
  };
  if (mbid && String(mbid).trim()) {
    payload.mbid = String(mbid).trim();
  }
  const response = await favoritesRequest(FAVORITES_TRACKS_URL, {
    method: shouldAdd ? 'POST' : 'DELETE',
    headers: buildAuthHeaders(true, true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = await parseJsonSafe<{ detail?: string }>(response);
    const message = payload.detail || `Favorite request failed (${response.status})`;
    throw new Error(message);
  }

  return response;
}

function emitFavoriteToggled(trackName: string, artistName: string, isFavorite: boolean): void {
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

function createFavoriteButton(
  trackName: string,
  artistName: string,
  isFavorite = false,
  mbid: string | null = null
): HTMLButtonElement {
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

async function isTrackFavorite(trackName: string, artistName: string): Promise<boolean> {
  try {
    const favorites = await ensureFavoritesLoaded();
    return favorites.has(getTrackKey(trackName, artistName));
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

async function createFavoriteButtonWithCheck(
  trackName: string,
  artistName: string,
  mbid: string | null = null
): Promise<HTMLButtonElement> {
  const isFavorite = await isTrackFavorite(trackName, artistName);
  return createFavoriteButton(trackName, artistName, isFavorite, mbid);
}

function resetFavoritesCache(): void {
  favoritesLoaded = false;
  favoritesLoadPromise = null;
  favoritesKeySet = new Set();
}

// Типизированный каст window-контракта: сохраняем прежние имена присваиваний.
const favoriteButtonWindow = window as unknown as Window & {
  createFavoriteButtonWithCheck: typeof createFavoriteButtonWithCheck;
  createFavoriteButton: typeof createFavoriteButton;
  isTrackFavorite: typeof isTrackFavorite;
  getCSRFToken: typeof getCSRFToken;
  getJWTToken: typeof getJWTToken;
  buildAuthHeaders: typeof buildAuthHeaders;
  resetFavoritesCache: typeof resetFavoritesCache;
  triggerHapticFeedback: typeof triggerHapticFeedback;
  isIOSDevice: typeof isIOSDevice;
};

if (typeof window !== 'undefined') {
  favoriteButtonWindow.createFavoriteButtonWithCheck = createFavoriteButtonWithCheck;
  favoriteButtonWindow.createFavoriteButton = createFavoriteButton;
  favoriteButtonWindow.isTrackFavorite = isTrackFavorite;
  favoriteButtonWindow.getCSRFToken = getCSRFToken;
  favoriteButtonWindow.getJWTToken = getJWTToken;
  favoriteButtonWindow.buildAuthHeaders = buildAuthHeaders;
  favoriteButtonWindow.resetFavoritesCache = resetFavoritesCache;
  favoriteButtonWindow.triggerHapticFeedback = triggerHapticFeedback;
  favoriteButtonWindow.isIOSDevice = isIOSDevice;
}

// CJS-мост: инертен в браузере (module не определён), нужен для CommonJS-загрузки.
declare const module: { exports: Record<string, unknown> } | undefined;

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
