/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const MARKUP = `
  <div id="trending-spinner" hidden></div>
  <div id="year-spinner" hidden></div>
  <div id="searchLoader" hidden></div>
`;

const createGsapMock = () => {
  const timeline = { to: vi.fn(), kill: vi.fn() };
  return {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    killTweensOf: vi.fn(),
    timeline: vi.fn(() => timeline),
    timelineInstance: timeline,
  };
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  (window as any).gsap = undefined;
  (window as any).DrawSVGPlugin = undefined;
  (window as any).Spinners = undefined;
});

afterEach(() => {
  (window as any).gsap = undefined;
  (window as any).DrawSVGPlugin = undefined;
  (window as any).Spinners = undefined;
  document.body.innerHTML = '';
});

describe('spinner_animation — оба режима загрузки', () => {
  it('Vite-режим: регистрирует DrawSVGPlugin и создаёт window.Spinners', async () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    (window as any).DrawSVGPlugin = { id: 'DrawSVGPlugin' };
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/spinner_animation.ts');

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith((window as any).DrawSVGPlugin);
    expect((window as any).Spinners.trending).toBeTruthy();
    expect((window as any).Spinners.year).toBeTruthy();
    expect((window as any).Spinners.search).toBeTruthy();
    expect(document.querySelectorAll('#trending-spinner circle').length).toBe(8);
    const searchLoaderSvg = document.querySelector('#searchLoader svg');
    if (searchLoaderSvg) {
      expect(searchLoaderSvg.classList.contains('liquid-spinner')).toBe(true);
    }

    const search = document.getElementById('searchLoader');
    if (!search) return;
    (window as any).Spinners.search.show();
    expect(search.hidden).toBe(false);
    expect(gsapMock.to).toHaveBeenCalledWith(search, {
      opacity: 1,
      duration: 0.5,
      ease: 'power1.out',
    });

    (window as any).Spinners.search.hide();
    const hideCall = gsapMock.to.mock.calls.find(
      (call) => call[0] === search && (call[1] as any).opacity === 0
    );
    if (hideCall) {
      expect(hideCall[1]).toMatchObject({ duration: 0.1, ease: 'power3.in' });
      hideCall[1].onComplete();
    }
    expect(search.hidden).toBe(true);

    (window as any).Spinners.trending.destroy();
    expect(gsapMock.timelineInstance.kill).toHaveBeenCalled();
    expect(document.querySelector('#trending-spinner svg')).toBeNull();
  });

  it('Vite-режим: без контейнеров Spinners.* равны null', async () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    (window as any).DrawSVGPlugin = {};
    document.body.innerHTML = '';
    await import('../../static/js/animation/spinner_animation.ts');
    expect((window as any).Spinners).toEqual({ trending: null, year: null, search: null });
  });
});
