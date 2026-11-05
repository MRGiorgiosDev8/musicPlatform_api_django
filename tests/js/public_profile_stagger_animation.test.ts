/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

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
  (window as any).requestAnimationFrame = (cb: (time: number) => void) => {
    cb(0);
    return 1;
  };
});

afterEach(() => {
  (window as any).gsap = undefined;
  document.body.innerHTML = '';
  (window as any).requestAnimationFrame = undefined;
});

describe('public_profile_stagger_animation — оба режима загрузки', () => {
  it('Vite-режим: с gsap анимирует карточку, треки и обрабатывает showMore', () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
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

    const publicCard = document.getElementById('public-card');
    if (publicCard) {
      expect(publicCard.style.opacity).toBe('1');
      expect(publicCard.style.transform).toBe('none');
    }

    const visible = Array.from(document.querySelectorAll('.track-item-playlist')).find(
      (item) => (item as HTMLElement).style.display !== 'none'
    );
    if (visible) {
      expect((visible as HTMLElement).style.opacity).toBe('1');
      expect((visible as HTMLElement).style.transform).toBe('none');
    }
  });
});
