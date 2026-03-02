/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const musicSearch = require('../../static/js/features/music_search.js');

describe('music_search P0', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('escapeHtml escapes dangerous symbols', () => {
    const unsafe = `<div class="x">Tom & 'Jerry'</div>`;
    expect(musicSearch.escapeHtml(unsafe)).toBe(
      '&lt;div class=&quot;x&quot;&gt;Tom &amp; &#039;Jerry&#039;&lt;/div&gt;'
    );
  });

  it('parseListeners parses numbers from formatted strings and nullable values', () => {
    expect(musicSearch.parseListeners('1,234')).toBe(1234);
    expect(musicSearch.parseListeners('1 234')).toBe(1234);
    expect(musicSearch.parseListeners('')).toBe(0);
    expect(musicSearch.parseListeners(null)).toBe(0);
    expect(musicSearch.parseListeners(42)).toBe(42);
  });

  it('getTrackPopularity falls back from listeners to playcount', () => {
    expect(musicSearch.getTrackPopularity({ listeners: '9,999', playcount: '1' })).toBe(9999);
    expect(musicSearch.getTrackPopularity({ listeners: '0', playcount: '2,500' })).toBe(2500);
    expect(musicSearch.getTrackPopularity({ listeners: null, playcount: null })).toBe(0);
  });

  it('setCachedTrend/getCachedTrend returns cached data within TTL', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    musicSearch.setCachedTrend('trend:key', [{ name: 'A' }]);

    vi.spyOn(Date, 'now').mockReturnValue(1_000 + musicSearch.TREND_CACHE_TTL - 1);
    expect(musicSearch.getCachedTrend('trend:key')).toEqual([{ name: 'A' }]);
  });

  it('getCachedTrend returns null for expired cache and invalid JSON', () => {
    vi.spyOn(Date, 'now').mockReturnValue(musicSearch.TREND_CACHE_TTL + 2_000);
    localStorage.setItem(
      'trend:expired',
      JSON.stringify({
        ts: 1,
        data: [{ name: 'old' }],
      })
    );
    expect(musicSearch.getCachedTrend('trend:expired')).toBeNull();

    localStorage.setItem('trend:broken', '{not-json');
    expect(musicSearch.getCachedTrend('trend:broken')).toBeNull();
  });

  it('prepareTracks filters by artist and sorts by listeners asc/desc', () => {
    const tracks = [
      { name: 'Track A', artist: 'Adele', listeners: '1,000' },
      { name: 'Track B', artist: 'Bowie', listeners: '4,000' },
      { name: 'Track C', artist: 'Adele', listeners: '2,000' },
      { name: 'Track D', artist: '', playcount: '300' },
    ];

    const filteredAdele = musicSearch.prepareTracks(tracks, {
      artistFilter: 'adele',
      listenersSort: 'default',
    });
    expect(filteredAdele.map((t) => t.name)).toEqual(['Track A', 'Track C']);

    const asc = musicSearch.prepareTracks(tracks, {
      artistFilter: 'all',
      listenersSort: 'asc',
    });
    expect(asc.map((t) => t.name)).toEqual(['Track D', 'Track A', 'Track C', 'Track B']);

    const desc = musicSearch.prepareTracks(tracks, {
      artistFilter: 'all',
      listenersSort: 'desc',
    });
    expect(desc.map((t) => t.name)).toEqual(['Track B', 'Track C', 'Track A', 'Track D']);
  });
});
