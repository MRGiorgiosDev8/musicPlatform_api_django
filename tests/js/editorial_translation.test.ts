/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translateEditorialRoots } from '../../static/js/features/editorial_translation.ts';

const SEPARATOR = '___RUBYSOUND_EDITORIAL_TRANSLATION_SEPARATOR_9f3a2c___';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('editorial translation', () => {
  it('batches paragraph text, excludes links and keeps headings unchanged', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2>Keep heading</h2><p>Hello <a href="#">link</a> world</p>';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        responseData: { translatedText: `Привет ${SEPARATOR} мир` },
        quotaFinished: false,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await translateEditorialRoots([{ root, cacheKey: 'article-1' }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.searchParams.get('q')).toBe(`Hello ${SEPARATOR} world`);
    expect(root.querySelector('h2')?.textContent).toBe('Keep heading');
    expect(root.querySelector('a')?.textContent).toBe('link');
    expect(root.querySelector('p')?.textContent).toBe('Привет link мир');
  });

  it('uses the article cache and shows the quota message without changing original text', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Reliable text</p>';
    const notice = document.createElement('div');
    notice.setAttribute('hidden', '');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ quotaFinished: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await translateEditorialRoots([{ root, cacheKey: 'article-quota' }], notice);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(root.textContent).toBe('Reliable text');
    expect(notice.textContent).toBe('Translation limit reached. Try again later.');
    expect(notice.hasAttribute('hidden')).toBe(false);
  });

  it('keeps each request within MyMemory 500-byte q limit', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>First text</p><p>Second text</p>';
    const fetchMock = vi.fn().mockImplementation(async (request: string) => {
      const query = new URL(request).searchParams.get('q') || '';
      return {
        ok: true,
        json: async () => ({
          responseData: { translatedText: query.replace('First text', 'Первый текст') },
          quotaFinished: false,
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    await translateEditorialRoots([{ root, cacheKey: 'article-long' }]);

    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mock.calls.forEach(([request]) => {
      const query = new URL(String(request)).searchParams.get('q') || '';
      expect(new TextEncoder().encode(query).length).toBeLessThanOrEqual(500);
    });
  });
});
