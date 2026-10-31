/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

import '../../static/js/animation/carousel_animation.ts';

const createGsapMock = () => ({
  fromTo: vi.fn(),
});

afterEach(() => {
  delete window.gsap;
  document.body.innerHTML = '';
});

describe('carousel_animation — оба режима загрузки', () => {
  it('Vite-режим: side-effect модуль не вызывает gsap сам и не экспортирует API', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = '<button class="genre-btn">rock</button>';
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(gsapMock.fromTo).not.toHaveBeenCalled();
  });

  it('Legacy-режим: IIFE не бросает и не вызывает gsap без внешнего вызова', () => {
    const legacyCode = readFileSync('static/js/animation/carousel_animation.js', 'utf8');
    const gsapMock = createGsapMock();
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><button class="genre-btn">rock</button></body></html>',
      {
        runScripts: 'outside-only',
      }
    );
    dom.window.gsap = gsapMock;
    expect(() => dom.window.eval(legacyCode)).not.toThrow();
    expect(gsapMock.fromTo).not.toHaveBeenCalled();
    dom.window.close();
  });
});
