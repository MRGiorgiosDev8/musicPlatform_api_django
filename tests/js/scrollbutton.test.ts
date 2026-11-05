/* @vitest-environment jsdom */
/* global window */
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../static/js/UI/scrollbutton.ts';

const MARKUP = `
  <div class="carousel-wrapper">
    <div class="d-flex overflow-auto">
      <button class="genre-btn">Rock</button>
    </div>
    <button class="scroll-left"></button>
    <button class="scroll-right"></button>
  </div>
`;

const createGsapMock = () => ({
  registerPlugin: vi.fn(),
  to: vi.fn(),
});

const createScrollToPluginMock = () => ({ name: 'ScrollToPlugin' });

describe('scrollbutton — оба режима загрузки', () => {
  afterEach(() => {
    (window as any).gsap = undefined;
    (window as any).ScrollToPlugin = undefined;
    document.body.innerHTML = '';
  });

  it('TS-режим: клик по правой кнопке скроллит через gsap', () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    (window as any).ScrollToPlugin = createScrollToPluginMock();

    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith((window as any).ScrollToPlugin);

    const btnRight = document.querySelector('.scroll-right');
    if (!btnRight) return;
    (btnRight as HTMLElement).click();

    expect(gsapMock.to).toHaveBeenCalledTimes(1);
    const [target, vars] = gsapMock.to.mock.calls[0];
    const container = document.querySelector('.d-flex.overflow-auto');
    expect(target).toBe(container);
    expect(vars.duration).toBe(0.7);
    expect(vars.scrollTo).toBeDefined();
    expect(typeof (vars.scrollTo as any).x).toBe('number');
  });

  it('TS-режим: без разметки карусели скрипт не падает', () => {
    document.body.innerHTML = '';
    expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
  });
});
