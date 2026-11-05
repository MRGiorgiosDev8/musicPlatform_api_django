/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const MARKUP = `
  <div id="navbarNav"></div>
  <img class="logo-img" style="margin-right: 12px" />
  <span class="logo-text">RubySound</span>
`;

const createGsapMock = () => ({
  set: vi.fn(),
  to: vi.fn(),
  killTweensOf: vi.fn(),
});

const mockMatchMedia = (matches: boolean) => {
  const media = {
    matches,
    addEventListener: vi.fn(),
  };
  (window as any).matchMedia = vi.fn(() => media);
  return media;
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  (window as any).gsap = undefined;
});

afterEach(() => {
  (window as any).gsap = undefined;
  document.body.innerHTML = '';
});

describe('navbar_logo_collapse_animation — оба режима загрузки', () => {
  it('Vite-режим: без gsap или без узлов не анимирует', async () => {
    document.body.innerHTML = MARKUP;
    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect((window as any).gsap).toBeUndefined();

    vi.resetModules();
    (window as any).gsap = createGsapMock();
    document.body.innerHTML = '<div id="navbarNav"></div>';
    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect((window as any).gsap.set).not.toHaveBeenCalled();
  });

  it('Vite-режим: стартовое состояние expanded и collapse-события', async () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    mockMatchMedia(false);
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');

    expect(gsapMock.set).toHaveBeenCalled();
    const expandedCall = gsapMock.set.mock.calls.find((call) =>
      (call[0] as HTMLElement).classList?.contains('logo-img')
    );
    if (expandedCall) {
      expect(expandedCall[1]).toMatchObject({
        width: 70,
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
      });
    }

    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav) navbarNav.dispatchEvent(new Event('show.bs.collapse'));
    expect(gsapMock.killTweensOf).toHaveBeenCalled();
    expect(
      gsapMock.to.mock.calls.some(
        (call) => (call[1] as any).width === 0 && (call[1] as any).opacity === 0
      )
    ).toBe(true);

    if (navbarNav) navbarNav.dispatchEvent(new Event('hide.bs.collapse'));
    expect(
      gsapMock.to.mock.calls.some(
        (call) => (call[1] as any).width === 70 && (call[1] as any).opacity === 1
      )
    ).toBe(true);
  });

  it('Vite-режим: prefers-reduced-motion ставит состояние без to()', async () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    mockMatchMedia(true);
    document.body.innerHTML = MARKUP;
    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav) navbarNav.classList.add('show');

    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect(gsapMock.to).not.toHaveBeenCalled();
    expect(
      gsapMock.set.mock.calls.some(
        (call) => (call[1] as any).width === 0 && (call[1] as any).opacity === 0
      )
    ).toBe(true);

    if (navbarNav) navbarNav.dispatchEvent(new Event('hide.bs.collapse'));
    expect(gsapMock.to).not.toHaveBeenCalled();
    expect(
      gsapMock.set.mock.calls.some(
        (call) => (call[1] as any).opacity === 1 && (call[1] as any).width === 70
      )
    ).toBe(true);
  });
});
