/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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
  delete window.animateGenreBtn;
  delete window.showActiveReveal;
  delete window.hideActiveReveal;
});

afterEach(() => {
  delete window.gsap;
  delete window.animateGenreBtn;
  delete window.showActiveReveal;
  delete window.hideActiveReveal;
  document.body.innerHTML = '';
});

describe('radial_reveal_animation — оба режима загрузки', () => {
  it('Vite-режим: desktop mouseenter/mouseleave и guard animateGenreBtn', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.matchMedia = vi.fn(() => ({ matches: false }));
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/radial_reveal_animation.ts');

    const btn = document.querySelector('.genre-btn');
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

    window.showActiveReveal(btn);
    window.hideActiveReveal(btn);
    expect(gsapMock.set).toHaveBeenCalledTimes(1);
  });

  it('Vite-режим: touch-ветка showActiveReveal/hideActiveReveal', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.matchMedia = vi.fn((query) => ({
      matches: query === '(hover: none) and (pointer: coarse)',
    }));
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/radial_reveal_animation.ts');
    const btn = document.querySelector('.genre-btn');

    btn.dispatchEvent(new window.MouseEvent('mouseenter', { clientX: 1, clientY: 1 }));
    expect(gsapMock.set).not.toHaveBeenCalled();

    window.showActiveReveal(btn);
    expect(gsapMock.set).toHaveBeenCalledTimes(1);
    window.hideActiveReveal(btn);
    expect(gsapMock.to.mock.calls.some((call) => call[1].scale === 0)).toBe(true);

    const lateBtn = document.createElement('button');
    lateBtn.className = 'genre-btn';
    lateBtn.innerHTML = '<span class="genre-btn-reveal"></span>';
    window.animateGenreBtn(lateBtn, 3);
    expect(lateBtn.dataset.radialRevealInit).toBeUndefined();
  });

  it('Legacy-режим: IIFE вешает window.animateGenreBtn', () => {
    const legacyCode = readFileSync('static/js/animation/radial_reveal_animation.js', 'utf8');
    const gsapMock = createGsapMock();
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    dom.window.gsap = gsapMock;
    dom.window.matchMedia = () => ({ matches: false });
    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const btn = dom.window.document.querySelector('.genre-btn');
    btn.dispatchEvent(new dom.window.MouseEvent('mouseenter', { clientX: 4, clientY: 5 }));
    expect(gsapMock.set).toHaveBeenCalled();
    expect(typeof dom.window.animateGenreBtn).toBe('function');
    expect(typeof dom.window.showActiveReveal).toBe('function');
    expect(typeof dom.window.hideActiveReveal).toBe('function');
    dom.window.close();
  });
});
