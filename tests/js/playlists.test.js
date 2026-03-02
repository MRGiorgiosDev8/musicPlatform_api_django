/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playlists = require('../../static/js/UI/playlists.js');

const createTrackItem = ({ trackIndex, artist = '', trackArtistInCard }) => {
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

describe('playlists P1', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('buildTrackRecords extracts artist/index and normalizes fallback index', () => {
    const first = createTrackItem({ trackIndex: 5, artist: 'Muse' });
    const second = createTrackItem({ artist: 'Adele' });
    const third = createTrackItem({ trackIndex: 'not-a-number', artist: 'Bowie' });

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
    expect(view.sorted.map((r) => r.index)).toEqual([3, 1]);
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

    expect(newest.sorted.map((r) => r.index)).toEqual([8, 5, 2]);
    expect(oldest.sorted.map((r) => r.index)).toEqual([2, 5, 8]);
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
    expect(view.visible.map((r) => r.index)).toEqual([9, 8, 7, 6, 5, 4]);
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
