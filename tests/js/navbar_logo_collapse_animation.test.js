/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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

const mockMatchMedia = (matches) => {
  const media = {
    matches,
    addEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn(() => media);
  return media;
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;
});

afterEach(() => {
  delete window.gsap;
  document.body.innerHTML = '';
});

describe('navbar_logo_collapse_animation — оба режима загрузки', () => {
  it('Vite-режим: без gsap или без узлов не анимирует', async () => {
    document.body.innerHTML = MARKUP;
    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect(window.gsap).toBeUndefined();

    vi.resetModules();
    window.gsap = createGsapMock();
    document.body.innerHTML = '<div id="navbarNav"></div>';
    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect(window.gsap.set).not.toHaveBeenCalled();
  });

  it('Vite-режим: стартовое состояние expanded и collapse-события', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    mockMatchMedia(false);
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');

    expect(gsapMock.set).toHaveBeenCalled();
    const expandedCall = gsapMock.set.mock.calls.find((call) =>
      call[0].classList?.contains('logo-img')
    );
    expect(expandedCall[1]).toMatchObject({
      width: 70,
      opacity: 1,
      x: 0,
      pointerEvents: 'auto',
    });

    document.getElementById('navbarNav').dispatchEvent(new Event('show.bs.collapse'));
    expect(gsapMock.killTweensOf).toHaveBeenCalled();
    expect(
      gsapMock.to.mock.calls.some((call) => call[1].width === 0 && call[1].opacity === 0)
    ).toBe(true);

    document.getElementById('navbarNav').dispatchEvent(new Event('hide.bs.collapse'));
    expect(
      gsapMock.to.mock.calls.some((call) => call[1].width === 70 && call[1].opacity === 1)
    ).toBe(true);
  });

  it('Vite-режим: prefers-reduced-motion ставит состояние без to()', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    mockMatchMedia(true);
    document.body.innerHTML = MARKUP;
    document.getElementById('navbarNav').classList.add('show');

    await import('../../static/js/animation/navbar_logo_collapse_animation.ts');
    expect(gsapMock.to).not.toHaveBeenCalled();
    expect(
      gsapMock.set.mock.calls.some((call) => call[1].width === 0 && call[1].opacity === 0)
    ).toBe(true);

    document.getElementById('navbarNav').dispatchEvent(new Event('hide.bs.collapse'));
    expect(gsapMock.to).not.toHaveBeenCalled();
    expect(
      gsapMock.set.mock.calls.some((call) => call[1].opacity === 1 && call[1].width === 70)
    ).toBe(true);
  });

  it('Legacy-режим: IIFE синхронизирует логотип при show.bs.collapse', () => {
    const legacyCode = readFileSync(
      'static/js/animation/navbar_logo_collapse_animation.js',
      'utf8'
    );
    const gsapMock = createGsapMock();
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    dom.window.gsap = gsapMock;
    dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {} });
    dom.window.eval(legacyCode);
    // Safari-фикс инициализирует логотип по load (fallback) либо после
    // успокоения MutationObserver, а не по DOMContentLoaded. Диспатчим load,
    // чтобы initOnce отработал синхронно до show.bs.collapse.
    dom.window.dispatchEvent(new dom.window.Event('load'));

    dom.window.document
      .getElementById('navbarNav')
      .dispatchEvent(new dom.window.Event('show.bs.collapse'));
    expect(gsapMock.to).toHaveBeenCalled();
    dom.window.close();
  });
});
