/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const setupDom = () => {
  document.body.innerHTML = `
    <form class="form-search">
      <div class="position-relative">
        <input id="search-query" class="input-search" type="text" />
      </div>
    </form>
  `;
  const form = document.querySelector('.form-search');
  form.requestSubmit = vi.fn();
};

describe('search_autocomplete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    setupDom();
  });

  it('normalizeText removes diacritics and lowercases', () => {
    delete require.cache[require.resolve('../../static/js/UI/search_autocomplete.js')];
    const { normalizeText } = require('../../static/js/UI/search_autocomplete.js');
    expect(normalizeText('Björk')).toBe('bjork');
    expect(normalizeText('  Édith   Piaf ')).toBe('edith piaf');
  });

  it('buildItems prefers startsWith and sorts by listeners', () => {
    delete require.cache[require.resolve('../../static/js/UI/search_autocomplete.js')];
    const { buildItems } = require('../../static/js/UI/search_autocomplete.js');
    const rows = [
      { name: 'Lil Yachy', listeners: 5 },
      { name: 'Lil Yachty', listeners: 5000 },
      { name: 'Post Malone', listeners: 9000 },
      { name: 'Lil Wayne', listeners: 8000 },
    ];
    const items = buildItems(rows, 'lil ya');
    expect(items[0].label).toBe('Lil Yachty');
    expect(items.some((item) => item.label === 'Post Malone')).toBe(false);
  });

  it('renders dropdown items and selects on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { name: 'Post Malone', listeners: 9000 },
          { name: 'Lil Yachty', listeners: 8000 },
        ],
      }),
    });

    delete require.cache[require.resolve('../../static/js/UI/search_autocomplete.js')];
    require('../../static/js/UI/search_autocomplete.js');

    const input = document.getElementById('search-query');
    input.value = 'pos';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.runAllTimersAsync();

    const dropdown = document.querySelector('.search-autocomplete');
    expect(dropdown.hidden).toBe(false);
    const items = dropdown.querySelectorAll('.search-autocomplete-item');
    expect(items.length).toBeGreaterThan(0);

    items[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    const form = document.querySelector('.form-search');
    expect(form.requestSubmit).toHaveBeenCalled();
    expect(input.value.length).toBeGreaterThan(0);
  });
});
