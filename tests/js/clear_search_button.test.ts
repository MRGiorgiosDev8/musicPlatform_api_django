/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/UI/clear_search_button.ts';

const MARKUP = `
  <input id="search-query" value="metallica">
  <button id="clearSearch">Очистить</button>
`;

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('clear_search_button — оба режима загрузки', () => {
  it('Vite-режим: клик очищает поле, диспатчит input/change и разблокирует обработчик', () => {
    vi.useFakeTimers();
    // jsdom не предоставляет requestAnimationFrame — подменяем через фейковый таймер.
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 16));
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const input = document.getElementById('search-query');
    const clearButton = document.getElementById('clearSearch');
    if (!input || !clearButton) return;
    const onInput = vi.fn();
    const onChange = vi.fn();
    input.addEventListener('input', onInput);
    input.addEventListener('change', onChange);

    clearButton.click();
    expect((input as HTMLInputElement).value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    // rAF-завершение: кнопка скрывается (два rAF: начальный 'flex' и после очистки 'none')
    vi.advanceTimersByTime(32);
    expect(clearButton.style.display).toBe('none');

    // таймер разблокировки: повторный клик снова очищает поле
    vi.advanceTimersByTime(100);
    (input as HTMLInputElement).value = 'again';
    clearButton.click();
    expect((input as HTMLInputElement).value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(2);
  });
});
