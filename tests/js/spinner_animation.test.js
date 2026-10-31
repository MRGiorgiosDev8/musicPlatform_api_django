/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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
  delete window.gsap;
  delete window.DrawSVGPlugin;
  delete window.Spinners;
});

afterEach(() => {
  delete window.gsap;
  delete window.DrawSVGPlugin;
  delete window.Spinners;
  document.body.innerHTML = '';
});

describe('spinner_animation — оба режима загрузки', () => {
  it('Vite-режим: регистрирует DrawSVGPlugin и создаёт window.Spinners', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.DrawSVGPlugin = { id: 'DrawSVGPlugin' };
    document.body.innerHTML = MARKUP;

    await import('../../static/js/animation/spinner_animation.ts');

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith(window.DrawSVGPlugin);
    expect(window.Spinners.trending).toBeTruthy();
    expect(window.Spinners.year).toBeTruthy();
    expect(window.Spinners.search).toBeTruthy();
    expect(document.querySelectorAll('#trending-spinner circle').length).toBe(8);
    expect(document.querySelector('#searchLoader svg').classList.contains('liquid-spinner')).toBe(
      true
    );

    const search = document.getElementById('searchLoader');
    window.Spinners.search.show();
    expect(search.hidden).toBe(false);
    expect(gsapMock.to).toHaveBeenCalledWith(search, {
      opacity: 1,
      duration: 0.5,
      ease: 'power1.out',
    });

    window.Spinners.search.hide();
    const hideCall = gsapMock.to.mock.calls.find(
      (call) => call[0] === search && call[1].opacity === 0
    );
    expect(hideCall[1]).toMatchObject({ duration: 0.1, ease: 'power3.in' });
    hideCall[1].onComplete();
    expect(search.hidden).toBe(true);

    window.Spinners.trending.destroy();
    expect(gsapMock.timelineInstance.kill).toHaveBeenCalled();
    expect(document.querySelector('#trending-spinner svg')).toBeNull();
  });

  it('Vite-режим: без контейнеров Spinners.* равны null', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.DrawSVGPlugin = {};
    document.body.innerHTML = '';
    await import('../../static/js/animation/spinner_animation.ts');
    expect(window.Spinners).toEqual({ trending: null, year: null, search: null });
  });

  it('Legacy-режим: IIFE создаёт те же контролы', () => {
    const legacyCode = readFileSync('static/js/animation/spinner_animation.js', 'utf8');
    const gsapMock = createGsapMock();
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
    });
    dom.window.gsap = gsapMock;
    dom.window.DrawSVGPlugin = { id: 'DrawSVGPlugin' };
    dom.window.eval(legacyCode);

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith(dom.window.DrawSVGPlugin);
    expect(dom.window.Spinners.search).toBeTruthy();
    expect(dom.window.document.querySelectorAll('#year-spinner circle').length).toBe(8);
    dom.window.close();
  });
});
