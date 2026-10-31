/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener
// ровно один раз на глобальном document тестового окружения.
import '../../static/js/UI/avatar_actions_toggle.ts';

const MARKUP = `
  <details class="avatar-actions" open>
    <summary>Меню</summary>
  </details>
`;

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// Для legacy-режима таймеры JSDOM не подчиняются vi.useFakeTimers —
// перехватываем window.setTimeout и выполняем отложенные колбэки вручную.
function installTimerRecorder(win) {
  const pending = [];
  win.setTimeout = (fn) => {
    pending.push(fn);
    return pending.length;
  };
  win.clearTimeout = () => {};
  return pending;
}

describe('avatar_actions_toggle — оба режима загрузки', () => {
  it('Vite-режим: клик по summary запускает закрытие, таймер завершает его', () => {
    vi.useFakeTimers();
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const details = document.querySelector('.avatar-actions');
    const summary = details.querySelector('summary');

    summary.click();
    // открытый details остаётся открытым (preventDefault) и получает .is-closing
    expect(details.hasAttribute('open')).toBe(true);
    expect(details.classList.contains('is-closing')).toBe(true);

    // завершение отложенного действия (220 мс)
    vi.advanceTimersByTime(220);
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.classList.contains('is-closing')).toBe(false);
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/UI/avatar_actions_toggle.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    const pending = installTimerRecorder(dom.window);
    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const details = dom.window.document.querySelector('.avatar-actions');
    const summary = details.querySelector('summary');

    summary.click();
    expect(details.hasAttribute('open')).toBe(true);
    expect(details.classList.contains('is-closing')).toBe(true);

    expect(pending).toHaveLength(1);
    pending[0]();
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.classList.contains('is-closing')).toBe(false);

    dom.window.close();
  });
});
