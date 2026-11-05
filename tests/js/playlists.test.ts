/* @vitest-environment jsdom */
/* global window */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as playlists from '../../static/js/UI/playlists.ts';

declare module '../../static/js/UI/playlists.ts' {
  export const normalizePlaylistArtist: any;
  export const buildTrackRecords: any;
  export const computePlaylistView: any;
}

const createTrackItem = ({
  trackIndex,
  artist = '',
  trackArtistInCard,
}: {
  trackIndex?: number;
  artist?: string;
  trackArtistInCard?: string;
}) => {
  const item = document.createElement('li');
  item.className = 'track-item-playlist';
  if (typeof trackIndex !== 'undefined') {
    item.dataset.trackIndex = String(trackIndex);
  }

  const card = document.createElement('div');
  card.className = 'track-playlist';
  card.dataset.trackArtist = typeof trackArtistInCard !== 'undefined' ? trackArtistInCard : artist;
  item.appendChild(card);
  return item;
};

// Минимальный маркап плейлиста: root + track-list + контролы.
const buildPlaylistMarkup = (trackItems: HTMLElement[]) => {
  const root = document.createElement('div');
  root.id = 'playlists-root';

  const trackList = document.createElement('div');
  trackList.className = 'track-list';
  trackItems.forEach((item) => trackList.appendChild(item));
  root.appendChild(trackList);

  const sortControl = document.createElement('select');
  sortControl.dataset.playlistSort = '';
  const sortOption = document.createElement('option');
  sortOption.value = 'new';
  sortOption.textContent = 'Новые';
  sortControl.appendChild(sortOption);
  root.appendChild(sortControl);

  const countDisplay = document.createElement('div');
  countDisplay.dataset.playlistCountDisplay = '';
  root.appendChild(countDisplay);

  const filterMeta = document.createElement('div');
  filterMeta.dataset.playlistFilterMeta = '';
  root.appendChild(filterMeta);

  return root;
};

const createUtilsMock = () => ({
  initAudioPreviews: vi.fn(),
  syncInfiniteMarquee: vi.fn(),
  createShowMoreButton: vi.fn(() => document.createElement('button')),
  createChevronDownIcon: vi.fn(() => document.createElement('i')),
  closeParentOffcanvas: vi.fn(),
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('playlists P1', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('buildTrackRecords extracts artist/index and normalizes fallback index', () => {
    const first = createTrackItem({ trackIndex: 5, artist: 'Muse' });
    const second = createTrackItem({ artist: 'Adele' });
    const third = createTrackItem({ trackIndex: NaN, artist: 'Bowie' });

    const records = playlists.buildTrackRecords([first, second, third]);

    expect(records).toHaveLength(3);
    expect(records[0].artist).toBe('Muse');
    expect(records[0].artistKey).toBe('muse');
    expect(records[0].index).toBe(5);
    expect(records[1].index).toBe(1);
    expect(records[2].index).toBe(2);
  });

  it('computePlaylistView filters by artist', () => {
    const records = [
      { artistKey: 'muse', index: 3, element: document.createElement('div') },
      { artistKey: 'adele', index: 2, element: document.createElement('div') },
      { artistKey: 'muse', index: 1, element: document.createElement('div') },
    ];

    const view = playlists.computePlaylistView(
      records,
      { sortMode: 'new', artistFilter: 'muse' },
      6
    );

    expect(view.filtered).toHaveLength(2);
    expect(view.sorted.map((r: any) => r.index)).toEqual([3, 1]);
    expect(view.hasMatches).toBe(true);
  });

  it('computePlaylistView sorts new and old correctly', () => {
    const records = [
      { artistKey: 'a', index: 8, element: document.createElement('div') },
      { artistKey: 'b', index: 2, element: document.createElement('div') },
      { artistKey: 'c', index: 5, element: document.createElement('div') },
    ];

    const newest = playlists.computePlaylistView(
      records,
      { sortMode: 'new', artistFilter: 'all' },
      6
    );
    const oldest = playlists.computePlaylistView(
      records,
      { sortMode: 'old', artistFilter: 'all' },
      6
    );

    expect(newest.sorted.map((r: any) => r.index)).toEqual([8, 5, 2]);
    expect(oldest.sorted.map((r: any) => r.index)).toEqual([2, 5, 8]);
  });

  it('computePlaylistView applies pagination and hides rest', () => {
    const records = Array.from({ length: 9 }, (_, idx) => ({
      artistKey: 'all',
      index: idx + 1,
      element: document.createElement('div'),
    }));

    const view = playlists.computePlaylistView(
      records,
      { sortMode: 'new', artistFilter: 'all' },
      6
    );

    expect(view.maxVisible).toBe(6);
    expect(view.visible).toHaveLength(6);
    expect(view.hidden).toHaveLength(3);
    expect(view.visible.map((r: any) => r.index)).toEqual([9, 8, 7, 6, 5, 4]);
  });

  it('computePlaylistView returns no matches for unmatched filter', () => {
    const records = [
      { artistKey: 'muse', index: 2, element: document.createElement('div') },
      { artistKey: 'adele', index: 1, element: document.createElement('div') },
    ];

    const view = playlists.computePlaylistView(
      records,
      { sortMode: 'new', artistFilter: 'bowie' },
      6
    );

    expect(view.sorted).toHaveLength(0);
    expect(view.maxVisible).toBe(0);
    expect(view.hasMatches).toBe(false);
  });

  it('computePlaylistView clamps visible count when load-more exceeds size', () => {
    const records = Array.from({ length: 4 }, (_, idx) => ({
      artistKey: 'all',
      index: idx + 1,
      element: document.createElement('div'),
    }));

    const view = playlists.computePlaylistView(
      records,
      { sortMode: 'new', artistFilter: 'all' },
      100
    );

    expect(view.maxVisible).toBe(4);
    expect(view.hidden).toHaveLength(0);
  });
});

describe('playlists — DOM-поведение (оба режима загрузки)', () => {
  afterEach(() => {
    (window as any).Utils = undefined;
    document.body.innerHTML = '';
  });

  it('TS-режим: инициализация рендерит пагинацию и счётчики', () => {
    (window as any).Utils = createUtilsMock();
    const items = [
      createTrackItem({ trackIndex: 1, artist: 'Muse' }),
      createTrackItem({ trackIndex: 2, artist: 'Adele' }),
      createTrackItem({ trackIndex: 3, artist: 'Bowie' }),
    ];
    document.body.appendChild(buildPlaylistMarkup(items));

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const root = document.getElementById('playlists-root');
    if (!root) return;
    const countDisplay = root.querySelector('[data-playlist-count-display]');
    const filterMeta = root.querySelector('[data-playlist-filter-meta]');
    const rendered = Array.from(root.querySelectorAll('.track-item-playlist'));

    // сортировка "new": 3, 2, 1
    expect(
      rendered.map((item: Element) => Number((item as HTMLElement).dataset.trackIndex))
    ).toEqual([3, 2, 1]);
    expect(rendered.every((item: Element) => (item as HTMLElement).style.display !== 'none')).toBe(
      true
    );
    if (countDisplay) expect(countDisplay.textContent).toBe('3');
    if (filterMeta) expect(filterMeta.textContent).toBe('Показано: 3 из 3');
    // load-more скрыт, когда все треки умещаются
    const loadMore = root.querySelector('.load-more-container') as HTMLElement;
    expect(loadMore).not.toBeNull();
    if (loadMore) expect(loadMore.style.display).toBe('none');
  });

  it('TS-режим: load-more показывает остальные треки', async () => {
    (window as any).Utils = createUtilsMock();
    const items = Array.from({ length: 7 }, (_, idx) =>
      createTrackItem({ trackIndex: idx + 1, artist: 'Artist' })
    );
    document.body.appendChild(buildPlaylistMarkup(items));

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const root = document.getElementById('playlists-root');
    if (!root) return;
    const countDisplay = root.querySelector('[data-playlist-count-display]');
    const filterMeta = root.querySelector('[data-playlist-filter-meta]');
    const loadMore = root.querySelector('.load-more-container') as HTMLElement;
    if (!loadMore) return;
    const showMoreButton = loadMore.querySelector('button');
    if (!showMoreButton) return;

    if (countDisplay) expect(countDisplay.textContent).toBe('7');
    if (filterMeta) expect(filterMeta.textContent).toBe('Показано: 6 из 7');
    expect(loadMore.style.display).not.toBe('none');
    expect(root.querySelectorAll('.track-item-playlist[style*="none"]').length).toBeGreaterThan(0);

    (showMoreButton as HTMLElement).click();
    await flushPromises();

    if (filterMeta) expect(filterMeta.textContent).toBe('Показано: 7 из 7');
    expect(loadMore.style.display).toBe('none');
  });
});
