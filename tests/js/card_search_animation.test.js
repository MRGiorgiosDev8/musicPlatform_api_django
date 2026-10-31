/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const createGsapMock = () => {
  const timeline = { to: vi.fn() };
  return { set: vi.fn(), timeline: vi.fn(() => timeline), timelineInstance: timeline };
};

const flushObserver = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const originalReadyState = Object.getOwnPropertyDescriptor(window.Document.prototype, 'readyState');

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;
});

afterEach(() => {
  if (originalReadyState) {
    Object.defineProperty(document, 'readyState', originalReadyState);
  }
  delete window.gsap;
  document.body.innerHTML = '';
});

describe('card_search_animation — оба режима загрузки', () => {
  it('Vite-режим: при readyState=loading ждёт DOMContentLoaded, затем анимирует #searchResults', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'loading',
    });

    await import('../../static/js/animation/card_search_animation.ts');
    expect(gsapMock.timeline).not.toHaveBeenCalled();

    document.body.innerHTML = `
      <div id="searchResults">
        <div class="track-item"></div>
        <div class="track-item-playlist"></div>
      </div>
    `;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushObserver();

    document.body.appendChild(document.createElement('div'));
    await flushObserver();

    expect(gsapMock.timeline).toHaveBeenCalledWith({ delay: 0.25 });
    expect(gsapMock.set).toHaveBeenCalledTimes(2);
    expect(gsapMock.timelineInstance.to).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.track-item').dataset.animated).toBe('true');
    expect(document.querySelector('.track-item-playlist').dataset.animated).toBe('true');
  });

  it('Vite-режим: уже существующий #searchResults обрабатывается через observer на body', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = '<div id="host"></div>';

    await import('../../static/js/animation/card_search_animation.ts');

    const container = document.createElement('div');
    container.id = 'searchResults';
    container.innerHTML = '<div class="track-item"></div>';
    document.body.appendChild(container);
    await flushObserver();

    expect(gsapMock.set).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.track-item').dataset.animated).toBe('true');

    const nested = document.createElement('div');
    nested.innerHTML = '<div class="track-item-playlist"></div>';
    container.appendChild(nested);
    await flushObserver();

    expect(gsapMock.set).toHaveBeenCalledTimes(2);
    expect(nested.querySelector('.track-item-playlist').dataset.animated).toBe('true');
  });

  it('Vite-режим: повторно не анимирует элементы с dataset.animated', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML =
      '<div id="searchResults"><div class="track-item" data-animated="true"></div></div>';

    await import('../../static/js/animation/card_search_animation.ts');
    document.body.appendChild(document.createElement('span'));
    await flushObserver();

    expect(gsapMock.set).not.toHaveBeenCalled();
    expect(gsapMock.timelineInstance.to).not.toHaveBeenCalled();
  });

  it('Legacy-режим: сгенерированный IIFE анимирует появившиеся карточки', async () => {
    const legacyCode = readFileSync('static/js/animation/card_search_animation.js', 'utf8');
    const gsapMock = createGsapMock();
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="host"></div></body></html>', {
      runScripts: 'outside-only',
    });
    dom.window.gsap = gsapMock;

    // Ждём завершения парсинга документа JSDOM: иначе jsdom сам повторно
    // дёрнет DOMContentLoaded, IIFE зарегистрирует второй bodyObserver, чей
    // колбэк сработает уже после close() на разобранном document.
    await flushObserver();
    expect(dom.window.document.readyState).not.toBe('loading');

    dom.window.eval(legacyCode);

    const container = dom.window.document.createElement('div');
    container.id = 'searchResults';
    const item = dom.window.document.createElement('div');
    item.className = 'track-item';
    container.appendChild(item);
    dom.window.document.body.appendChild(container);
    await flushObserver();

    expect(gsapMock.set).toHaveBeenCalledTimes(1);
    expect(item.dataset.animated).toBe('true');
    dom.window.close();
  });
});
