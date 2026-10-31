/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Vite-режим: IIFE исполняется при импорте и сразу вешает click-listener на document.
import '../../static/js/UI/search_button_scroll.ts';

const MARKUP = '<button class="custom-button">Наверх</button>';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('search_button_scroll — оба режима загрузки', () => {
  it('Vite-режим: клик по .custom-button скроллит вверх после отложенного вызова', () => {
    vi.useFakeTimers();
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    document.body.innerHTML = MARKUP;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    document.querySelector('.custom-button').click();
    // отложенный вызов ещё не выполнен
    expect(scrollSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/UI/search_button_scroll.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    const pending = [];
    dom.window.setTimeout = (fn) => {
      pending.push(fn);
      return pending.length;
    };
    const scrollTo = vi.fn();
    dom.window.scrollTo = scrollTo;
    dom.window.eval(legacyCode);

    dom.window.document.body.style.overflow = 'hidden';
    dom.window.document.documentElement.style.overflow = 'hidden';

    dom.window.document.querySelector('.custom-button').click();
    expect(scrollTo).not.toHaveBeenCalled();

    expect(pending).toHaveLength(1);
    pending[0]();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    expect(dom.window.document.body.style.overflow).toBe('');
    expect(dom.window.document.documentElement.style.overflow).toBe('');

    dom.window.close();
  });
});
