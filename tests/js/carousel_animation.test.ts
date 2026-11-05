/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

import '../../static/js/animation/carousel_animation.ts';

const createGsapMock = () => ({
  fromTo: vi.fn(),
});

afterEach(() => {
  (window as any).gsap = undefined;
  document.body.innerHTML = '';
});

describe('carousel_animation — оба режима загрузки', () => {
  it('Vite-режим: side-effect модуль не вызывает gsap сам и не экспортирует API', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = '<button class="genre-btn">rock</button>';
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(gsapMock.fromTo).not.toHaveBeenCalled();
  });
});
