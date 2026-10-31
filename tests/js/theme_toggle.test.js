/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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
  delete window.scrollY;
});

// Legacy-режим: перехватываем таймеры и rAF изолированного окна JSDOM.
function installLegacyTimers(win) {
  const pending = [];
  win.setTimeout = (fn, ms) => {
    pending.push({ fn, ms });
    return pending.length;
  };
  win.clearTimeout = () => {};
  win.requestAnimationFrame = (fn) => {
    pending.push({ fn, ms: 16, isRaf: true });
    return pending.length;
  };
  return pending;
}

describe('theme_toggle — оба режима загрузки', () => {
  it('Vite-режим: клик переключает тему, скролл показывает кнопку, idle-таймер скрывает', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    document.body.innerHTML = MARKUP;
    // IIFE модуля исполняется именно здесь — кнопка уже в DOM, слушатель навешивается.
    await import('../../static/js/UI/theme_toggle.ts');

    const button = document.getElementById('themeToggle');

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

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/UI/theme_toggle.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    });
    const pending = installLegacyTimers(dom.window);
    Object.defineProperty(dom.window, 'scrollY', { configurable: true, value: 0 });
    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const button = dom.window.document.getElementById('themeToggle');
    const root = dom.window.document.documentElement;

    expect(root.getAttribute('data-theme')).toBe('default');
    expect(dom.window.localStorage.getItem('site-theme')).toBe('default');

    button.click();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(dom.window.localStorage.getItem('site-theme')).toBe('dark');
    expect(button.classList.contains('is-dark')).toBe(true);

    // скролл → rAF → видима
    Object.defineProperty(dom.window, 'scrollY', { configurable: true, value: 200 });
    dom.window.dispatchEvent(new dom.window.Event('scroll'));
    const raf = pending.find((t) => t.isRaf);
    expect(raf).toBeTruthy();
    raf.fn();
    expect(button.classList.contains('is-visible')).toBe(true);

    // idle-таймер (последний записанный) скрывает кнопку
    const idleTimer = pending[pending.length - 1];
    expect(idleTimer.ms).toBe(3000);
    idleTimer.fn();
    expect(button.classList.contains('is-visible')).toBe(false);

    dom.window.close();
  });
});
