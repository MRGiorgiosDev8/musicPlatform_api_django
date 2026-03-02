/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const publicPlaylist = require('../../static/js/UI/public-playlist.js');

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createTrackItems = (count) => {
  const root = document.getElementById('public-playlist-root');
  for (let i = 0; i < count; i += 1) {
    const li = document.createElement('li');
    li.className = 'track-item-playlist';
    root.appendChild(li);
  }
};

describe('public-playlist P1', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('computePublicPlaylistPagination returns expected visible and hasMore state', () => {
    const page = publicPlaylist.computePublicPlaylistPagination(10, 6, 4);
    expect(page.maxVisible).toBe(6);
    expect(page.visibleIndexes).toEqual([0, 1, 2, 3, 4, 5]);
    expect(page.newlyVisibleIndexes).toEqual([4, 5]);
    expect(page.hasMore).toBe(true);
  });

  it('resolvePublicPlaylistViewMode accepts grid and falls back to list', () => {
    expect(publicPlaylist.resolvePublicPlaylistViewMode('grid')).toBe('grid');
    expect(publicPlaylist.resolvePublicPlaylistViewMode('list')).toBe('list');
    expect(publicPlaylist.resolvePublicPlaylistViewMode('unknown')).toBe('list');
  });

  it('toggles public like via POST then DELETE and updates UI', async () => {
    document.body.innerHTML = `
      <div data-public-like-root data-public-username="john doe"></div>
      <button id="public-playlist-like-btn" aria-pressed="false" class="btn btn-sm btn-outline-danger"></button>
      <span id="public-profile-likes-stat">0</span>
      <div id="public-playlist-root"></div>
    `;
    createTrackItems(2);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ liked_by_me: true, likes_count: 11 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ liked_by_me: false, likes_count: 10 }),
      });

    publicPlaylist.initPublicPlaylistPage();

    const button = document.getElementById('public-playlist-like-btn');
    const likes = document.getElementById('public-profile-likes-stat');

    button.click();
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/playlists/public/john%20doe/like/',
      expect.objectContaining({ method: 'POST' })
    );
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.className).toContain('btn-danger');
    expect(likes.textContent).toBe('11');

    button.click();
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/john%20doe/like/',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.className).toContain('btn-outline-danger');
    expect(likes.textContent).toBe('10');
  });

  it('applies saved view mode and persists on toggle', () => {
    document.body.innerHTML = `
      <div data-public-like-root data-public-username="alex"></div>
      <div id="public-playlist-root"></div>
      <button data-track-view="list"></button>
      <button data-track-view="grid"></button>
    `;
    createTrackItems(1);

    const key = publicPlaylist.getPublicPlaylistViewStorageKey('alex');
    localStorage.setItem(key, 'grid');

    publicPlaylist.initPublicPlaylistPage();

    const root = document.getElementById('public-playlist-root');
    const [listBtn, gridBtn] = Array.from(document.querySelectorAll('[data-track-view]'));

    expect(root.classList.contains('public-view-grid')).toBe(true);
    expect(gridBtn.classList.contains('active')).toBe(true);
    expect(listBtn.classList.contains('active')).toBe(false);

    listBtn.click();

    expect(root.classList.contains('public-view-grid')).toBe(false);
    expect(localStorage.getItem(key)).toBe('list');
    expect(listBtn.classList.contains('active')).toBe(true);
  });
});
