/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const PLAY = 'M0 0 L10 5 L0 10 Z';
const PAUSE = 'M0 0 H4 V10 H0 Z';

const buttonMarkup = (extraClass = '') => `
  <button class="audio-preview-toggle ${extraClass}">
    <svg><path data-play-path="${PLAY}" data-pause-path="${PAUSE}"></path></svg>
  </button>
`;

const createGsapMock = () => ({
  registerPlugin: vi.fn(),
  killTweensOf: vi.fn(),
  to: vi.fn(),
});

const flushObserver = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;
  delete window.MorphSVGPlugin;
});

afterEach(() => {
  delete window.gsap;
  delete window.MorphSVGPlugin;
  document.body.innerHTML = '';
});

describe('wavesurfer_morph_button — оба режима загрузки', () => {
  it('Vite-режим: без gsap/MorphSVGPlugin ничего не регистрирует', async () => {
    document.body.innerHTML = buttonMarkup();
    // @ts-expect-error — классический скрипт без ESM-экспортов
    await import('../../static/js/animation/wavesurfer_morph_button.ts');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.querySelector<HTMLButtonElement>('button')!.dataset.morphInit).toBeUndefined();
  });

  it('Vite-режим: init, class is-playing и MutationObserver', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.MorphSVGPlugin = { id: 'MorphSVGPlugin' };
    document.body.innerHTML = buttonMarkup();

    // @ts-expect-error — классический скрипт без ESM-экспортов
    await import('../../static/js/animation/wavesurfer_morph_button.ts');
    expect(gsapMock.registerPlugin).toHaveBeenCalledWith(window.MorphSVGPlugin);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    const btn = document.querySelector<HTMLButtonElement>('.audio-preview-toggle')!;
    expect(btn.dataset.morphInit).toBe('true');
    const path = btn.querySelector('path');
    expect(gsapMock.to).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ duration: 0.35, ease: 'power3.out', morphSVG: PLAY })
    );

    btn.classList.add('is-playing');
    await flushObserver();
    expect(gsapMock.to.mock.calls.some((call) => call[1].morphSVG === PAUSE)).toBe(true);

    const wrap = document.createElement('div');
    wrap.innerHTML = buttonMarkup('now-playing-toggle').replace(
      'audio-preview-toggle',
      'now-playing-toggle'
    );
    document.body.appendChild(wrap);
    await flushObserver();
    expect(wrap.querySelector<HTMLButtonElement>('button')!.dataset.morphInit).toBe('true');
  });
});
