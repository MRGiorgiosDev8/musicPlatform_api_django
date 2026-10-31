/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener
// ровно один раз на глобальном document тестового окружения.
import '../../static/js/animation/hamburger_animation.ts';

const HAMBURGER_MARKUP = '<button class="hamburger hamburger--elastic">Меню</button>';

describe('hamburger_animation — поведение в обоих режимах загрузки', () => {
  it('Vite-режим: TS-источник переключает .is-active и возвращает обратно', () => {
    document.body.innerHTML = HAMBURGER_MARKUP;
    // Ровно один DOMContentLoaded: обработчик модуля сработает один раз,
    // повторного навешивания click-обработчиков не будет.
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const button = document.querySelector('.hamburger');
    expect(button.classList.contains('is-active')).toBe(false);

    button.click();
    expect(button.classList.contains('is-active')).toBe(true);

    button.click();
    expect(button.classList.contains('is-active')).toBe(false);
  });

  it('Legacy-режим: сгенерированный .js (IIFE) ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/animation/hamburger_animation.js', 'utf8');

    // Изолированное окно: собственный document и собственные обработчики.
    // runScripts: 'outside-only' разрешает window.eval для классического скрипта.
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${HAMBURGER_MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    dom.window.eval(legacyCode);
    // Ровно один DOMContentLoaded в этом окне.
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const button = dom.window.document.querySelector('.hamburger');
    expect(button.classList.contains('is-active')).toBe(false);

    button.click();
    expect(button.classList.contains('is-active')).toBe(true);

    button.click();
    expect(button.classList.contains('is-active')).toBe(false);

    dom.window.close();
  });
});
