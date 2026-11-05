/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';

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
    if (!button) return;
    expect(button.classList.contains('is-active')).toBe(false);

    (button as HTMLElement).click();
    expect(button.classList.contains('is-active')).toBe(true);

    (button as HTMLElement).click();
    expect(button.classList.contains('is-active')).toBe(false);
  });
});
