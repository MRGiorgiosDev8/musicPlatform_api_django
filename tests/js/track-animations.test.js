/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/track-animations.ts';

const LOGO_MARKUP = '<div class="logo-text">RubySoundFM</div>';

const createGsapMock = () => {
  const tl = { to: vi.fn(), fromTo: vi.fn() };
  return { set: vi.fn(), timeline: vi.fn(() => tl), tl };
};

const createSplitTextStub = () => {
  const instances = [];
  const SplitTextMock = vi.fn(function (target, vars) {
    this.chars = [document.createElement('span'), document.createElement('span')];
    this.vars = vars;
    instances.push(this);
  });
  return { SplitTextMock, instances };
};

afterEach(() => {
  delete window.gsap;
  delete window.SplitText;
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('track-animations — оба режима загрузки', () => {
  it('Vite-режим: без отметки в sessionStorage запускает анимацию логотипа', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    const { SplitTextMock, instances } = createSplitTextStub();
    window.SplitText = SplitTextMock;
    document.body.innerHTML = LOGO_MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.timeline).toHaveBeenCalledTimes(1);
    expect(gsapMock.timeline).toHaveBeenCalledWith({ delay: 0.4 });

    // SplitText создан для последней части с посимвольным разбиением
    expect(window.SplitText).toHaveBeenCalledTimes(1);
    expect(instances[0].vars).toEqual({ type: 'chars' });

    // первый to — scrambleText для первой части логотипа
    const firstTween = gsapMock.tl.to.mock.calls[0];
    expect(firstTween[0]).toBe(document.querySelector('.logo-first-part'));
    expect(firstTween[1].scrambleText.text).toBe('RubySound');
    expect(firstTween[1].duration).toBe(1.5);

    // gsap.set для chars и второй to
    expect(gsapMock.set).toHaveBeenCalledWith(instances[0].chars, { opacity: 0, y: 30 });
    expect(gsapMock.tl.to.mock.calls[1][0]).toBe(instances[0].chars);
    expect(gsapMock.tl.to.mock.calls[1][1]).toMatchObject({ stagger: 0.1 });

    // отметка проставлена в sessionStorage
    expect(window.sessionStorage.getItem('logoAnimated')).toBe('true');
  });

  it('Vite-режим: при проставленной отметке не строит анимацию, а сбрасывает стили', () => {
    window.sessionStorage.setItem('logoAnimated', 'true');
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.SplitText = vi.fn(function () {});
    document.body.innerHTML = LOGO_MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.timeline).not.toHaveBeenCalled();
    expect(window.SplitText).not.toHaveBeenCalled();
    expect(gsapMock.set).toHaveBeenCalledTimes(2);
    expect(gsapMock.set.mock.calls[0][0]).toBe(document.querySelector('.logo-first-part'));
    expect(gsapMock.set.mock.calls[0][1]).toEqual({ clearProps: 'all' });
    expect(gsapMock.set.mock.calls[1][0]).toBe(document.querySelector('.logo-last-part'));
  });

  it('Vite-режим: клик по navbar-brand сбрасывает отметку анимации', () => {
    window.sessionStorage.setItem('logoAnimated', 'true');
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.SplitText = vi.fn(function () {});
    document.body.innerHTML = `
      <div class="logo-text">RubySoundFM</div>
      <a class="navbar-brand" href="/">Brand</a>
    `;

    document.dispatchEvent(new Event('DOMContentLoaded'));
    // skip-ветка initLogoHeader ключ не трогает
    expect(window.sessionStorage.getItem('logoAnimated')).toBe('true');

    document.querySelector('.navbar-brand').click();
    expect(window.sessionStorage.getItem('logoAnimated')).toBeNull();
  });
});
