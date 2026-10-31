/* @vitest-environment jsdom */
/* global window */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import '../../static/js/UI/scrollbutton.ts';

const MARKUP = `
  <div class="carousel-wrapper">
    <div class="d-flex overflow-auto">
      <button class="genre-btn">Rock</button>
    </div>
    <button class="scroll-left"></button>
    <button class="scroll-right"></button>
  </div>
`;

const createGsapMock = () => ({
  registerPlugin: vi.fn(),
  to: vi.fn(),
});

const createScrollToPluginMock = () => ({ name: 'ScrollToPlugin' });

describe('scrollbutton — оба режима загрузки', () => {
  afterEach(() => {
    delete window.gsap;
    delete window.ScrollToPlugin;
    document.body.innerHTML = '';
  });

  it('TS-режим: клик по правой кнопке скроллит через gsap', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.ScrollToPlugin = createScrollToPluginMock();

    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith(window.ScrollToPlugin);

    const btnRight = document.querySelector('.scroll-right');
    btnRight.click();

    expect(gsapMock.to).toHaveBeenCalledTimes(1);
    const [target, vars] = gsapMock.to.mock.calls[0];
    const container = document.querySelector('.d-flex.overflow-auto');
    expect(target).toBe(container);
    expect(vars.duration).toBe(0.7);
    expect(vars.scrollTo).toBeDefined();
    expect(typeof vars.scrollTo.x).toBe('number');
  });

  it('TS-режим: без разметки карусели скрипт не падает', () => {
    document.body.innerHTML = '';
    expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
  });

  it('Legacy-режим: сгенерированный IIFE скроллит так же', () => {
    const legacyCode = readFileSync('static/js/UI/scrollbutton.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      url: 'http://localhost/',
      runScripts: 'outside-only',
    });
    const gsapMock = createGsapMock();
    const scrollToPluginMock = createScrollToPluginMock();
    dom.window.gsap = gsapMock;
    dom.window.ScrollToPlugin = scrollToPluginMock;

    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith(scrollToPluginMock);

    const btnRight = dom.window.document.querySelector('.scroll-right');
    btnRight.click();

    expect(gsapMock.to).toHaveBeenCalledTimes(1);
    const [target, vars] = gsapMock.to.mock.calls[0];
    const container = dom.window.document.querySelector('.d-flex.overflow-auto');
    expect(target).toBe(container);
    expect(vars.duration).toBe(0.7);
    expect(vars.scrollTo).toBeDefined();
    expect(typeof vars.scrollTo.x).toBe('number');

    dom.window.close();
  });
});
