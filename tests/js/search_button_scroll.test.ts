/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

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

    document.querySelector<HTMLButtonElement>('.custom-button')!.click();
    // отложенный вызов ещё не выполнен
    expect(scrollSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
