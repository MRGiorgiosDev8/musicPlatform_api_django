/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const favoriteButton = require('../../static/js/UI/favorite-button.js');

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('favorite-button', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      writable: true,
      value: '',
    });
    localStorage.clear();
    favoriteButton.resetFavoritesCache();
    vi.restoreAllMocks();
  });

  it('returns csrf token from meta tag first', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'meta-token';
    document.head.appendChild(meta);
    document.cookie = 'csrftoken=cookie-token';

    expect(favoriteButton.getCSRFToken()).toBe('meta-token');
  });

  it('falls back to csrf cookie when meta token is not provided', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'NOTPROVIDED';
    document.head.appendChild(meta);
    document.cookie = 'csrftoken=cookie%20token';

    expect(favoriteButton.getCSRFToken()).toBe('cookie token');
  });

  it('returns first available jwt token from localStorage', () => {
    localStorage.setItem('jwt_access', 'jwt-123');
    localStorage.setItem('token', 'fallback-token');

    expect(favoriteButton.getJWTToken()).toBe('jwt-123');
  });

  it('builds auth headers based on token and flags', () => {
    localStorage.setItem('access_token', 'abc123');
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'csrf-meta';
    document.head.appendChild(meta);

    expect(favoriteButton.buildAuthHeaders(true, true)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc123',
      'X-CSRFToken': 'csrf-meta',
    });
  });

  it('deduplicates favorites loading across concurrent checks', async () => {
    let resolveFetch;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    global.fetch = fetchMock;

    const first = favoriteButton.isTrackFavorite('Song A', 'Artist A');
    const second = favoriteButton.isTrackFavorite('Song B', 'Artist B');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tracks: [{ name: 'Song A', artist: 'Artist A' }],
      }),
    });

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(false);
  });

  it('toggles favorite button state and emits event', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    const toggleListener = vi.fn();
    document.addEventListener('favoriteToggled', toggleListener);

    const button = favoriteButton.createFavoriteButton('Track 1', 'Artist 1', false, 'mbid-1');
    document.body.appendChild(button);

    button.click();
    await flushPromises();
    await vi.waitFor(() => {
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/playlists/me/tracks/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Track 1', artist: 'Artist 1', mbid: 'mbid-1' }),
      })
    );
    expect(toggleListener).toHaveBeenCalledTimes(1);

    button.click();
    await flushPromises();
    await vi.waitFor(() => {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/playlists/me/tracks/',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    expect(toggleListener).toHaveBeenCalledTimes(2);
  });
});
