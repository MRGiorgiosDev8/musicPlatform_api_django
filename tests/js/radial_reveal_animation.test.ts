/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const MARKUP = `
  <button class="genre-btn">
    <span class="genre-btn-reveal"></span>
    rock
  </button>
`;

const createGsapMock = () => ({
  set: vi.fn(),
  to: vi.fn(),
  killTweensOf: vi.fn(),
});

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;
  delete (window as any).animateGenreBtn;
  delete window.showActiveReveal;
  delete window.hideActiveReveal;
});

afterEach(() => {
  delete window.gsap;
  delete (window as any).animateGenreBtn;
  delete window.showActiveReveal;
  delete window.hideActiveReveal;
  document.body.innerHTML = '';
});

describe('radial_reveal_animation — оба режима загрузки', () => {
  it('Vite-режим: desktop mouseenter/mouseleave и guard animateGenreBtn', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/radial_reveal_animation.ts');

    const btn = document.querySelector<HTMLElement>('.genre-btn')!;
    expect(btn.dataset.radialRevealInit).toBe('1');

    btn.dispatchEvent(new window.MouseEvent('mouseenter', { clientX: 10, clientY: 12 }));
    expect(gsapMock.set).toHaveBeenCalledTimes(1);
    expect(gsapMock.to.mock.calls[0][1]).toMatchObject({
      scale: 1,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: true,
    });

    btn.dispatchEvent(new window.MouseEvent('mouseleave'));
    expect(gsapMock.to.mock.calls[1][1]).toMatchObject({
      scale: 0,
      duration: 0.35,
      ease: 'expo.out',
      overwrite: true,
    });

    const other = document.createElement('button');
    window.animateGenreBtn(other, 0);
    expect(gsapMock.set).toHaveBeenCalledTimes(1);

    window.showActiveReveal!(btn);
    window.hideActiveReveal!(btn);
    expect(gsapMock.set).toHaveBeenCalledTimes(1);
  });

  it('Vite-режим: touch-ветка showActiveReveal/hideActiveReveal', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === '(hover: none) and (pointer: coarse)',
    })) as unknown as typeof window.matchMedia;
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/radial_reveal_animation.ts');
    const btn = document.querySelector<HTMLElement>('.genre-btn')!;

    btn.dispatchEvent(new window.MouseEvent('mouseenter', { clientX: 1, clientY: 1 }));
    expect(gsapMock.set).not.toHaveBeenCalled();

    window.showActiveReveal!(btn);
    expect(gsapMock.set).toHaveBeenCalledTimes(1);
    window.hideActiveReveal!(btn);
    expect(gsapMock.to.mock.calls.some((call) => call[1].scale === 0)).toBe(true);

    const lateBtn = document.createElement('button');
    lateBtn.className = 'genre-btn';
    lateBtn.innerHTML = '<span class="genre-btn-reveal"></span>';
    window.animateGenreBtn(lateBtn, 3);
    expect(lateBtn.dataset.radialRevealInit).toBeUndefined();
  });
});
