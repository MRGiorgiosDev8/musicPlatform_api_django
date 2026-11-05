/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/playlist_stagger_animation.ts';

const MARKUP = `
  <div id="playlists-root">
    <div class="track-item-playlist" style="display: block"></div>
    <button class="btn-show-more">Ещё</button>
  </div>
  <div id="playlist-filter-panel" style="display: block"></div>
  <button class="playlist-filter-mobile-trigger"></button>
`;

const createGsapMock = () => ({
  fromTo: vi.fn(),
});

const createIntersectionObserverMock = (observed: Element[], cbHolder: any) => {
  class FakeIntersectionObserver {
    constructor(callback: any) {
      cbHolder.callback = callback;
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  }
  return FakeIntersectionObserver;
};

beforeEach(() => {
  // jsdom не предоставляет requestAnimationFrame — колбэки исполняем синхронно.
  (window as any).requestAnimationFrame = (cb: (time: number) => void) => {
    cb(0);
    return 1;
  };
});

afterEach(() => {
  (window as any).gsap = undefined;
  (window as any).IntersectionObserver = undefined;
  document.body.innerHTML = '';
  (window as any).requestAnimationFrame = undefined;
});

describe('playlist_stagger_animation — оба режима загрузки', () => {
  it('Vite-режим: с gsap и IntersectionObserver анимация запускается при появлении контейнера', () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    const observed: Element[] = [];
    const ioState: any = {};
    (window as any).IntersectionObserver = createIntersectionObserverMock(observed, ioState);
    document.body.innerHTML = MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(observed).toEqual([document.getElementById('playlists-root')]);
    expect(gsapMock.fromTo).not.toHaveBeenCalled();

    ioState.callback([{ isIntersecting: true, target: document.getElementById('playlists-root') }]);

    // мобильный триггер, панель фильтров и видимые треки (rAF исполнен синхронно)
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(3);
    expect(gsapMock.fromTo.mock.calls[0][0]).toBe(
      document.querySelector('.playlist-filter-mobile-trigger')
    );
    expect(gsapMock.fromTo.mock.calls[1][0]).toBe(document.getElementById('playlist-filter-panel'));
    expect(gsapMock.fromTo.mock.calls[2][0].length).toBe(1);
    const trackItem = document.querySelector('.track-item-playlist') as HTMLElement;
    if (trackItem) {
      expect(trackItem.dataset.staggerAnimated).toBe('1');
    }
  });

  it('Vite-режим: клик по .btn-show-more анимирует новые видимые треки', () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    (window as any).IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.fromTo).not.toHaveBeenCalled();

    const showMoreBtn = document.querySelector('.btn-show-more');
    if (showMoreBtn) (showMoreBtn as HTMLElement).click();

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);
    expect(gsapMock.fromTo.mock.calls[0][0].length).toBe(1);
    const trackItem = document.querySelector('.track-item-playlist') as HTMLElement;
    if (trackItem) {
      expect(trackItem.dataset.staggerAnimated).toBe('1');
    }
  });

  it('Vite-режим: без gsap элементы показываются без анимации', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const item = document.querySelector('.track-item-playlist') as HTMLElement;
    const panel = document.getElementById('playlist-filter-panel') as HTMLElement;
    const trigger = document.querySelector('.playlist-filter-mobile-trigger') as HTMLElement;
    if (item) {
      expect(item.style.opacity).toBe('1');
      expect(item.style.transform).toBe('none');
    }
    if (panel) {
      expect(panel.style.opacity).toBe('1');
      expect(panel.style.transform).toBe('none');
    }
    if (trigger) {
      expect(trigger.style.opacity).toBe('1');
      expect(trigger.style.transform).toBe('none');
    }
  });
});
