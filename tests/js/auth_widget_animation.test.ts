/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/auth_widget_animation.ts';

const MARKUP = `
  <div class="auth-widget">Вход</div>
  <div class="signup-widget">Регистрация</div>
`;

const createGsapMock = () => ({
  fromTo: vi.fn(),
});

afterEach(() => {
  (window as any).gsap = undefined;
  document.body.innerHTML = '';
});

describe('auth_widget_animation — оба режима загрузки', () => {
  it('Vite-режим: с gsap анимирует виджеты', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);
    const [targets, fromVars, toVars] = gsapMock.fromTo.mock.calls[0];
    expect(targets.length).toBe(2);
    expect(targets[0].classList.contains('auth-widget')).toBe(true);
    expect(targets[1].classList.contains('signup-widget')).toBe(true);
    expect(fromVars).toEqual({ scale: 0.8, autoAlpha: 0, transformOrigin: '50% 50%' });
    expect(toVars).toEqual({
      scale: 1,
      autoAlpha: 1,
      duration: 0.3,
      delay: 0.3,
      ease: 'power2.out',
    });
  });

  it('Vite-режим: без gsap ничего не выполняется и не падает', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // при отсутствии gsap обработчик выходит по первому же условию без ошибок
    expect(document.querySelector('.auth-widget')).toBeTruthy();
  });
});
