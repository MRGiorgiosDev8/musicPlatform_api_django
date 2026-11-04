/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const createGsapMock = () => ({
  fromTo: vi.fn(),
  to: vi.fn(),
});

const flushObserver = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

// Служебный модуль при каждом import регистрирует обработчик DOMContentLoaded
// и MutationObserver на общем document. vi.resetModules() чистит только кэш модулей,
// поэтому эти побочные эффекты нужно вручную снимать между тестами.
const originalAddEventListener = document.addEventListener.bind(document);
const OriginalMutationObserver = globalThis.MutationObserver;
let domContentLoadedHandlers = [];
let mutationObservers = [];

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;

  domContentLoadedHandlers = [];
  mutationObservers = [];

  document.addEventListener = (type, callback, options) => {
    if (type === 'DOMContentLoaded') domContentLoadedHandlers.push(callback);
    return originalAddEventListener(type, callback, options);
  };
  globalThis.MutationObserver = class extends OriginalMutationObserver {
    constructor(callback) {
      super(callback);
      mutationObservers.push(this);
    }
  };
});

afterEach(() => {
  vi.useRealTimers();
  for (const handler of domContentLoadedHandlers) {
    document.removeEventListener('DOMContentLoaded', handler);
  }
  for (const observer of mutationObservers) {
    observer.disconnect();
  }
  delete document.addEventListener;
  globalThis.MutationObserver = OriginalMutationObserver;
  delete window.gsap;
  document.body.innerHTML = '';
});

describe('alert_log_animation — оба режима загрузки', () => {
  it('Vite-режим: анимирует существующие .alert-log и удаляет их после таймера', async () => {
    vi.useFakeTimers();
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = '<div class="alert-log">ok</div>';

    await import('../../static/js/animation/alert_log_animation.ts');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);
    expect(gsapMock.fromTo.mock.calls[0][1]).toEqual({ opacity: 0, scale: 0 });
    expect(gsapMock.fromTo.mock.calls[0][2]).toEqual({ opacity: 1, scale: 1, duration: 0.3 });

    vi.advanceTimersByTime(1500);
    expect(gsapMock.to).toHaveBeenCalledTimes(1);
    expect(gsapMock.to.mock.calls[0][1]).toMatchObject({ opacity: 0, scale: 0, duration: 0.3 });
    gsapMock.to.mock.calls[0][1].onComplete();
    expect(document.querySelector('.alert-log')).toBeNull();
  });

  it('Vite-режим: MutationObserver анимирует добавленный .alert-log и вложенные', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = '<div id="root"></div>';
    await import('../../static/js/animation/alert_log_animation.ts');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const alertNode = document.createElement('div');
    alertNode.className = 'alert-log';
    document.getElementById('root').appendChild(alertNode);

    const wrap = document.createElement('div');
    wrap.innerHTML = '<p class="alert-log">nested</p>';
    document.body.appendChild(wrap);
    await flushObserver();

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(2);
  });
});
