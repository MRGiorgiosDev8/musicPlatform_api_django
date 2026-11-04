/* @vitest-environment jsdom */
/* global window */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as searchAutocomplete from '../../static/js/UI/search_autocomplete.ts';

const MARKUP = `
  <form class="form-search">
    <div class="position-relative">
      <input id="search-query" class="input-search" type="text" />
    </div>
  </form>
`;

const setupDom = () => {
  document.body.innerHTML = MARKUP;
  const form = document.querySelector('.form-search');
  form.requestSubmit = vi.fn();
};

describe('search_autocomplete', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('normalizeText removes diacritics and lowercases', () => {
    const { normalizeText } = searchAutocomplete;
    expect(normalizeText('Björk')).toBe('bjork');
    expect(normalizeText('  Édith   Piaf ')).toBe('edith piaf');
  });

  it('buildItems prefers startsWith and sorts by listeners', () => {
    const { buildItems } = searchAutocomplete;
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

  describe('TS-режим: взаимодействие с DOM', () => {
    it('renders dropdown items and selects on click', async () => {
      vi.useFakeTimers();
      localStorage.clear();
      setupDom();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Post Malone', listeners: 9000 },
            { name: 'Lil Yachty', listeners: 8000 },
          ],
        }),
      });

      // модуль — side-effect IIFE, исполняется при импорте; переисполняем после DOM
      vi.resetModules();
      await import('../../static/js/UI/search_autocomplete.ts');

      const input = document.getElementById('search-query');
      input.value = 'pos';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      await vi.runAllTimersAsync();

      const dropdown = document.querySelector('.search-autocomplete');
      expect(dropdown.hidden).toBe(false);
      const items = dropdown.querySelectorAll('.search-autocomplete-item');
      expect(items.length).toBeGreaterThan(0);

      items[0].dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
      const form = document.querySelector('.form-search');
      expect(form.requestSubmit).toHaveBeenCalled();
      expect(input.value.length).toBeGreaterThan(0);
    });

    it('ignores short queries (fewer than 2 chars)', async () => {
      vi.useFakeTimers();
      localStorage.clear();
      setupDom();
      global.fetch = vi.fn();

      vi.resetModules();
      await import('../../static/js/UI/search_autocomplete.ts');

      const input = document.getElementById('search-query');
      input.value = 'p';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      await vi.runAllTimersAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
