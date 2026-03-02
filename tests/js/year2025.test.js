/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yearModule = require('../../static/js/features/year2025.js');

describe('year2025 P1', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="year2025-container"></div>';
    global.Utils = {
      getCached: vi.fn(),
      fetchData: vi.fn(),
      setCache: vi.fn(),
      showYearSpinner: vi.fn(),
      showError: vi.fn(),
      renderEmpty: vi.fn(),
      initGenreButtons: vi.fn(),
    };
    vi.restoreAllMocks();
  });

  it('buildYearChartUrl builds URL with encoded genre', () => {
    expect(yearModule.buildYearChartUrl('/music_api/year-chart/', 'k-pop & edm')).toBe(
      '/music_api/year-chart/?genre=k-pop%20%26%20edm'
    );
    expect(yearModule.buildYearChartUrl('/music_api/year-chart/', '')).toBe(
      '/music_api/year-chart/'
    );
  });

  it('extractYearTracks validates payload format', () => {
    expect(yearModule.extractYearTracks({ tracks: [{ name: 'A' }] })).toEqual([{ name: 'A' }]);
    expect(yearModule.extractYearTracks({ tracks: 'bad' })).toEqual([]);
    expect(() => yearModule.extractYearTracks(null)).toThrow('Неверный формат ответа сервера');
  });

  it('hasAudioPreview and resolveTrackPlaycount behave as expected', () => {
    expect(yearModule.hasAudioPreview('https://x/y.mp3')).toBe(true);
    expect(yearModule.hasAudioPreview('https://x/y.mp4')).toBe(false);
    expect(yearModule.resolveTrackPlaycount({ playcount: '11', listeners: '3' })).toBe('11');
    expect(yearModule.resolveTrackPlaycount({ listeners: '3' })).toBe('3');
    expect(yearModule.resolveTrackPlaycount({})).toBe(0);
  });

  it('load uses cache and skips fetch', async () => {
    const app = yearModule.Year2025App;
    app.cache = {};
    Utils.getCached.mockReturnValue([{ name: 'cached-track' }]);
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue();

    await app.load('rock');

    expect(Utils.getCached).toHaveBeenCalledWith(app.cache, 'rock');
    expect(renderSpy).toHaveBeenCalledWith([{ name: 'cached-track' }]);
    expect(Utils.fetchData).not.toHaveBeenCalled();
    expect(Utils.showYearSpinner).not.toHaveBeenCalled();
  });

  it('load fetches, caches, renders and toggles spinner', async () => {
    const app = yearModule.Year2025App;
    app.cache = {};
    Utils.getCached.mockReturnValue(null);
    Utils.fetchData.mockResolvedValue({ tracks: [{ name: 'New', artist: 'A' }] });
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue();

    await app.load('k-pop');

    expect(Utils.fetchData).toHaveBeenCalledWith('/music_api/year-chart/?genre=k-pop');
    expect(Utils.setCache).toHaveBeenCalledWith(app.cache, 'k-pop', [{ name: 'New', artist: 'A' }]);
    expect(renderSpy).toHaveBeenCalledWith([{ name: 'New', artist: 'A' }]);
    expect(Utils.showYearSpinner).toHaveBeenNthCalledWith(1, true);
    expect(Utils.showYearSpinner).toHaveBeenLastCalledWith(false);
  });

  it('load handles invalid payload as error and renders empty list', async () => {
    const app = yearModule.Year2025App;
    app.cache = {};
    Utils.getCached.mockReturnValue(null);
    Utils.fetchData.mockResolvedValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue();

    await app.load();

    expect(Utils.showError).toHaveBeenCalledWith(
      'year2025-container',
      'Неверный формат ответа сервера'
    );
    expect(renderSpy).toHaveBeenCalledWith([]);
    expect(Utils.showYearSpinner).toHaveBeenNthCalledWith(1, true);
    expect(Utils.showYearSpinner).toHaveBeenLastCalledWith(false);
  });

  it('render shows audio preview block and fallback no-preview block', async () => {
    const app = yearModule.Year2025App;
    app.renderVersion = 0;
    app.createFavoriteControl = vi.fn().mockResolvedValue(document.createElement('div'));

    await app.render([
      {
        name: 'Track 1',
        artist: 'Artist 1',
        url: 'https://x/one.mp3',
        playcount: 10,
        image_url: '',
      },
      { name: 'Track 2', artist: '', url: 'https://x/two.ogg', listeners: 7, image_url: '' },
    ]);

    const root = document.getElementById('year2025-container');
    expect(root.querySelectorAll('audio').length).toBe(1);
    expect(root.querySelectorAll('.year-track-no-preview').length).toBe(1);
    expect(root.querySelectorAll('.js-artist-bio-trigger').length).toBe(2);
  });
});
