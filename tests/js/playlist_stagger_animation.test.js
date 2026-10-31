/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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

const createIntersectionObserverMock = (observed, cbHolder) => {
  class FakeIntersectionObserver {
    constructor(callback) {
      cbHolder.callback = callback;
    }
    observe(el) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  }
  return FakeIntersectionObserver;
};

beforeEach(() => {
  // jsdom не предоставляет requestAnimationFrame — колбэки исполняем синхронно.
  window.requestAnimationFrame = (cb) => {
    cb(0);
    return 1;
  };
});

afterEach(() => {
  delete window.gsap;
  delete window.IntersectionObserver;
  document.body.innerHTML = '';
  window.requestAnimationFrame = undefined;
});

describe('playlist_stagger_animation — оба режима загрузки', () => {
  it('Vite-режим: с gsap и IntersectionObserver анимация запускается при появлении контейнера', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    const observed = [];
    const ioState = {};
    window.IntersectionObserver = createIntersectionObserverMock(observed, ioState);
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
    expect(document.querySelector('.track-item-playlist').dataset.staggerAnimated).toBe('1');
  });

  it('Vite-режим: клик по .btn-show-more анимирует новые видимые треки', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.fromTo).not.toHaveBeenCalled();

    document.querySelector('.btn-show-more').click();

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);
    expect(gsapMock.fromTo.mock.calls[0][0].length).toBe(1);
    expect(document.querySelector('.track-item-playlist').dataset.staggerAnimated).toBe('1');
  });

  it('Vite-режим: без gsap элементы показываются без анимации', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const item = document.querySelector('.track-item-playlist');
    const panel = document.getElementById('playlist-filter-panel');
    const trigger = document.querySelector('.playlist-filter-mobile-trigger');
    expect(item.style.opacity).toBe('1');
    expect(item.style.transform).toBe('none');
    expect(panel.style.opacity).toBe('1');
    expect(panel.style.transform).toBe('none');
    expect(trigger.style.opacity).toBe('1');
    expect(trigger.style.transform).toBe('none');
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/animation/playlist_stagger_animation.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    const gsapMock = createGsapMock();
    dom.window.gsap = gsapMock;
    const observed = [];
    const ioState = {};
    dom.window.IntersectionObserver = createIntersectionObserverMock(observed, ioState);
    dom.window.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };

    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    expect(observed).toEqual([dom.window.document.getElementById('playlists-root')]);

    ioState.callback([
      { isIntersecting: true, target: dom.window.document.getElementById('playlists-root') },
    ]);
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(3);

    dom.window.close();
  });
});
