/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/public_profile_stagger_animation.ts';

const MARKUP = `
  <div id="public-card"></div>
  <div id="public-playlist-root">
    <div class="track-item-playlist" style="display: block"></div>
    <div class="track-item-playlist" style="display: none"></div>
  </div>
`;

const createGsapMock = () => ({
  killTweensOf: vi.fn(),
  fromTo: vi.fn(),
});

beforeEach(() => {
  // jsdom не реализует requestAnimationFrame — колбэки исполняем синхронно.
  window.requestAnimationFrame = (cb) => {
    cb(0);
    return 1;
  };
});

afterEach(() => {
  delete window.gsap;
  document.body.innerHTML = '';
  window.requestAnimationFrame = undefined;
});

describe('public_profile_stagger_animation — оба режима загрузки', () => {
  it('Vite-режим: с gsap анимирует карточку, треки и обрабатывает showMore', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = MARKUP;

    // ровно один DOMContentLoaded (как в продакшене) — без дублирования listeners
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.killTweensOf).toHaveBeenCalled();
    const calls = gsapMock.fromTo.mock.calls;
    // 1-й вызов — карточка профиля, 2-й — видимый трек (display != none)
    expect(calls[0][0]).toBe(document.getElementById('public-card'));
    expect(calls[1][0].length).toBe(1);
    expect(calls[1][0][0].style.display).toBe('block');
    expect(calls.length).toBe(2);

    // событие showMore анимирует добавленные треки (rAF-колбэк исполнен синхронно)
    const more = document.createElement('div');
    more.className = 'track-item-playlist';
    document.dispatchEvent(
      new window.CustomEvent('publicPlaylist:showMore', { detail: { items: [more] } })
    );

    expect(gsapMock.fromTo.mock.calls.length).toBe(3);
    expect(gsapMock.fromTo.mock.calls[2][0]).toEqual([more]);
  });

  it('Vite-режим: без gsap карточка и треки показываются без анимации', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('public-card').style.opacity).toBe('1');
    expect(document.getElementById('public-card').style.transform).toBe('none');

    const visible = Array.from(document.querySelectorAll('.track-item-playlist')).find(
      (item) => item.style.display !== 'none'
    );
    expect(visible.style.opacity).toBe('1');
    expect(visible.style.transform).toBe('none');
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync(
      'static/js/animation/public_profile_stagger_animation.js',
      'utf8'
    );
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    const gsapMock = createGsapMock();
    dom.window.gsap = gsapMock;
    dom.window.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };

    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const calls = gsapMock.fromTo.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toBe(dom.window.document.getElementById('public-card'));
    expect(calls[1][0].length).toBe(1);

    dom.window.close();
  });
});
