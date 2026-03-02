/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const trendingModule = require('../../static/js/features/trending.js');

describe('trending P2', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="trending-container"></div>';
    global.Utils = {
      getCached: vi.fn(),
      fetchData: vi.fn(),
      setCache: vi.fn(),
      showTrendingSpinner: vi.fn(),
      showError: vi.fn(),
      renderEmpty: vi.fn(),
      initGenreButtons: vi.fn(),
    };
    vi.restoreAllMocks();
  });

  it('buildTrendingUrl builds URL with encoded genre', () => {
    expect(trendingModule.buildTrendingUrl('/music_api/trending/', 'hip hop')).toBe(
      '/music_api/trending/?genre=hip%20hop'
    );
    expect(trendingModule.buildTrendingUrl('/music_api/trending/')).toBe('/music_api/trending/');
  });

  it('extractTrendingArtists validates payload format', () => {
    expect(trendingModule.extractTrendingArtists({ artists: [{ name: 'A' }] })).toEqual([
      { name: 'A' },
    ]);
    expect(trendingModule.extractTrendingArtists({ artists: 'bad' })).toEqual([]);
    expect(() => trendingModule.extractTrendingArtists(undefined)).toThrow(
      'Неверный формат ответа сервера'
    );
  });

  it('render calls Utils.renderEmpty for empty list', () => {
    trendingModule.TrendingApp.render([]);
    expect(Utils.renderEmpty).toHaveBeenCalledWith('trending-container');
  });

  it('render creates cards and dispatches trending:rendered', () => {
    const renderedSpy = vi.fn();
    document.addEventListener('trending:rendered', renderedSpy);

    trendingModule.TrendingApp.render([
      {
        name: 'Muse',
        photo_url: '',
        releases: [
          { title: 'Absolution', cover: '', playcount: 100 },
          { title: '', cover: '', playcount: 3 },
        ],
      },
      null,
    ]);

    const root = document.getElementById('trending-container');
    expect(root.querySelectorAll('.card-custom').length).toBe(1);
    expect(root.querySelectorAll('.js-artist-bio-trigger').length).toBe(1);
    expect(root.querySelectorAll('li').length).toBe(1);
    expect(renderedSpy).toHaveBeenCalledTimes(1);
  });

  it('load uses cache and skips fetch', async () => {
    const app = trendingModule.TrendingApp;
    app.cache = {};
    Utils.getCached.mockReturnValue([{ name: 'cached-artist' }]);
    const renderSpy = vi.spyOn(app, 'render').mockImplementation(() => {});

    await app.load('jazz');

    expect(Utils.getCached).toHaveBeenCalledWith(app.cache, 'jazz');
    expect(renderSpy).toHaveBeenCalledWith([{ name: 'cached-artist' }]);
    expect(Utils.fetchData).not.toHaveBeenCalled();
    expect(Utils.showTrendingSpinner).not.toHaveBeenCalled();
  });

  it('load handles invalid payload via showError and renders empty', async () => {
    const app = trendingModule.TrendingApp;
    app.cache = {};
    Utils.getCached.mockReturnValue(null);
    Utils.fetchData.mockResolvedValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderSpy = vi.spyOn(app, 'render').mockImplementation(() => {});

    await app.load();

    expect(Utils.showError).toHaveBeenCalledWith(
      'trending-container',
      'Неверный формат ответа сервера'
    );
    expect(renderSpy).toHaveBeenCalledWith([]);
    expect(Utils.showTrendingSpinner).toHaveBeenNthCalledWith(1, true);
    expect(Utils.showTrendingSpinner).toHaveBeenLastCalledWith(false);
  });
});
