/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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

// Legacy-режим: перехватываем window.setTimeout и window.requestAnimationFrame,
// чтобы детерминированно завершать отложенные действия.
function installLegacyTimers(win) {
  const pending = [];
  win.setTimeout = (fn, ms) => {
    pending.push({ fn, ms });
    return pending.length;
  };
  win.requestAnimationFrame = (fn) => {
    pending.push({ fn, ms: 16, isRaf: true });
    return pending.length;
  };
  return pending;
}

describe('clear_search_button — оба режима загрузки', () => {
  it('Vite-режим: клик очищает поле, диспатчит input/change и разблокирует обработчик', () => {
    vi.useFakeTimers();
    // jsdom не предоставляет requestAnimationFrame — подменяем через фейковый таймер.
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16));
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const input = document.getElementById('search-query');
    const clearButton = document.getElementById('clearSearch');
    const onInput = vi.fn();
    const onChange = vi.fn();
    input.addEventListener('input', onInput);
    input.addEventListener('change', onChange);

    clearButton.click();
    expect(input.value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    // rAF-завершение: кнопка скрывается (два rAF: начальный 'flex' и после очистки 'none')
    vi.advanceTimersByTime(32);
    expect(clearButton.style.display).toBe('none');

    // таймер разблокировки: повторный клик снова очищает поле
    vi.advanceTimersByTime(100);
    input.value = 'again';
    clearButton.click();
    expect(input.value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/UI/clear_search_button.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    const pending = installLegacyTimers(dom.window);
    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const input = dom.window.document.getElementById('search-query');
    const clearButton = dom.window.document.getElementById('clearSearch');
    const onInput = vi.fn();
    input.addEventListener('input', onInput);

    clearButton.click();
    expect(input.value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(1);

    // rAF → скрытие кнопки (оба rAF: начальный 'flex' и после очистки 'none')
    const rafs = pending.filter((t) => t.isRaf);
    expect(rafs.length).toBeGreaterThanOrEqual(2);
    rafs.forEach((raf) => raf.fn());
    expect(clearButton.style.display).toBe('none');

    // таймер разблокировки → повторный клик работает
    const unlock = pending.find((t) => !t.isRaf);
    expect(unlock).toBeTruthy();
    unlock.fn();
    input.value = 'again';
    clearButton.click();
    expect(input.value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(2);

    dom.window.close();
  });
});
