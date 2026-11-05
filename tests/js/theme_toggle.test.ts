/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// theme_toggle исполняется при импорте (IIFE, без DOMContentLoaded),
// поэтому Vite-режим импортируется динамически ПОСЛЕ установки разметки.

const MARKUP = '<button id="themeToggle">Тема</button>';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

describe('theme_toggle — оба режима загрузки', () => {
  it('Vite-режим: клик переключает тему, скролл показывает кнопку, idle-таймер скрывает', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 16));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    document.body.innerHTML = MARKUP;
    // IIFE модуля исполняется именно здесь — кнопка уже в DOM, слушатель навешивается.
    await import('../../static/js/UI/theme_toggle.ts');

    const button = document.getElementById('themeToggle');
    if (!button) return;

    // исходное состояние после применения темы
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    expect(localStorage.getItem('site-theme')).toBe('default');

    // клик → тёмная тема
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('site-theme')).toBe('dark');
    expect(button.classList.contains('is-dark')).toBe(true);

    // повторный клик → возврат к исходной
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    expect(button.classList.contains('is-dark')).toBe(false);

    // скролл ниже 120px → кнопка видима (через rAF)
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(16);
    expect(button.classList.contains('is-visible')).toBe(true);

    // idle-таймер (3000 мс) скрывает кнопку
    vi.advanceTimersByTime(3000);
    expect(button.classList.contains('is-visible')).toBe(false);
  });
});
