/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

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

describe('avatar_actions_toggle — оба режима загрузки', () => {
  it('Vite-режим: клик по summary запускает закрытие, таймер завершает его', () => {
    vi.useFakeTimers();
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const details = document.querySelector('.avatar-actions');
    if (!details) return;
    const summary = details.querySelector('summary');
    if (!summary) return;

    summary.click();
    // открытый details остаётся открытым (preventDefault) и получает .is-closing
    expect(details.hasAttribute('open')).toBe(true);
    expect(details.classList.contains('is-closing')).toBe(true);

    // завершение отложенного действия (220 мс)
    vi.advanceTimersByTime(220);
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.classList.contains('is-closing')).toBe(false);
  });
});
