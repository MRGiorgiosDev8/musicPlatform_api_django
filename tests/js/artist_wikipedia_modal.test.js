/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const wikipediaModal = require('../../static/js/features/artist_wikipedia_modal.js');

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
