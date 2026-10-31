/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as wikipediaModal from './helpers/artist_wikipedia_modal.js';

describe('artist wikipedia batching P2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it('deduplicates same artist in queue and makes one batch request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        artists: {
          Muse: { bio: 'bio', image_url: '', source_url: '', lang: 'ru' },
        },
      }),
    });

    const batcher = wikipediaModal.createWikipediaArtistBatcher({
      fetchImpl: fetchMock,
      getHeaders: () => ({ 'Content-Type': 'application/json' }),
    });

    const firstPromise = batcher.queueArtist('Muse');
    const secondPromise = batcher.queueArtist('muse');
    const thirdPromise = batcher.queueArtist(' Muse ');
    vi.runAllTimers();
    const [first, second, third] = await Promise.all([firstPromise, secondPromise, thirdPromise]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wikipedia/artists/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ artists: ['Muse'], lang: 'ru' }),
      })
    );
    expect(first.bio).toBe('bio');
    expect(second.bio).toBe('bio');
    expect(third.bio).toBe('bio');
  });

  it('returns cached payload without extra fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        artists: {
          Adele: { bio: 'hello', image_url: '', source_url: '', lang: 'ru' },
        },
      }),
    });

    const batcher = wikipediaModal.createWikipediaArtistBatcher({
      fetchImpl: fetchMock,
      getHeaders: () => ({ 'Content-Type': 'application/json' }),
    });

    const firstPromise = batcher.queueArtist('Adele');
    vi.runAllTimers();
    await firstPromise;
    const second = await batcher.queueArtist(' adele ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.bio).toBe('hello');
  });

  it('resolves with fallback payload when batch request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'boom' }),
    });

    const batcher = wikipediaModal.createWikipediaArtistBatcher({
      fetchImpl: fetchMock,
      getHeaders: () => ({ 'Content-Type': 'application/json' }),
    });

    const payloadPromise = batcher.queueArtist('Bowie');
    vi.runAllTimers();
    const payload = await payloadPromise;

    expect(payload).toEqual(
      expect.objectContaining({
        title: 'Bowie',
        bio: '',
        image_url: '',
      })
    );
  });

  it('prefetchMissing chunks requests by 12 and skips already cached', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ artists: {} }),
    });

    const batcher = wikipediaModal.createWikipediaArtistBatcher({
      fetchImpl: fetchMock,
      getHeaders: () => ({ 'Content-Type': 'application/json' }),
    });

    batcher.cache.set('artist-1', { bio: 'cached' });

    const artists = Array.from({ length: 25 }, (_, idx) => `Artist-${idx + 1}`);
    batcher.prefetchMissing(artists, 12);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const merged = [...firstBody.artists, ...secondBody.artists];

    expect(firstBody.artists).toHaveLength(12);
    expect(secondBody.artists).toHaveLength(12);
    expect(merged).not.toContain('Artist-1');
  });
});

describe('artist_wikipedia_modal — legacy IIFE', () => {
  it('открывает модалку по клику и рендерит биографию из батчера', async () => {
    const legacyCode = readFileSync('static/js/features/artist_wikipedia_modal.js', 'utf8');
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body>
        <div id="artistBioModal">
          <div id="artistBioModalTitle"></div>
          <div id="artistBioLoading"></div>
          <div id="artistBioContent"></div>
          <div id="artistBioImageWrap"><img id="artistBioImage" /></div>
        </div>
      </body></html>`,
      { runScripts: 'outside-only', url: 'http://localhost/' }
    );

    const showMock = vi.fn();
    dom.window.bootstrap = {
      Modal: vi.fn(function MockModal() {
        this.show = showMock;
      }),
    };
    dom.window.gsap = { killTweensOf: vi.fn(), set: vi.fn(), to: vi.fn() };
    dom.window.buildAuthHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        artists: {
          Muse: { bio: 'bio-muse', title: 'Muse', source_url: '', image_url: '', lang: 'ru' },
        },
      }),
    });
    dom.window.fetch = fetchMock;

    // JSDOM шлёт DOMContentLoaded асинхронно после парсинга — ждём его,
    // чтобы обработчик init зарегистрировал document click-listener.
    const domReady = new Promise((resolve) => {
      dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
    dom.window.eval(legacyCode);
    await domReady;

    const trigger = dom.window.document.createElement('button');
    trigger.className = 'js-artist-bio-trigger';
    trigger.dataset.artistName = 'Muse';
    dom.window.document.body.appendChild(trigger);
    trigger.click();

    await vi.waitFor(() => {
      expect(dom.window.document.getElementById('artistBioContent').textContent).toBe('bio-muse');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wikipedia/artists/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ artists: ['Muse'], lang: 'ru' }),
      })
    );
    expect(showMock).toHaveBeenCalled();
    expect(dom.window.gsap.to).toHaveBeenCalled();
    expect(dom.window.document.getElementById('artistBioModalTitle').textContent).toBe('Muse');
    dom.window.close();
  });
});
