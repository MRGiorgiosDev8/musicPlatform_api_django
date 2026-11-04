/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/profile_stagger_animation.ts';

const MARKUP = `
  <form>
    <button class="btn-ruby-profile" type="submit">Сохранить</button>
  </form>
  <input id="avatar" type="file">
  <div class="profile-avatar-wrap"></div>

  <div id="blcok-avatar"></div>
  <div id="block-info"></div>
  <div id="block-info-two"></div>
  <div id="block-password"></div>
  <div id="block-like-notifications"></div>
`;

const BLOCK_IDS = [
  'blcok-avatar',
  'block-info',
  'block-info-two',
  'block-password',
  'block-like-notifications',
];

const createGsapMock = () => {
  const tl = { fromTo: vi.fn(() => tl) };
  return { timeline: vi.fn(() => tl), tl };
};

afterEach(() => {
  delete window.gsap;
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('profile_stagger_animation — оба режима загрузки', () => {
  it('Vite-режим: без gsap блоки показываются без анимации', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    BLOCK_IDS.forEach((id) => {
      const el = document.getElementById(id);
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });
  });

  it('Vite-режим: skip-ключ отключает анимацию и удаляется', () => {
    document.body.innerHTML = MARKUP;
    window.sessionStorage.setItem('skipProfileAnimationOnce', '1');

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('block-info').style.opacity).toBe('1');
    expect(document.getElementById('block-info').style.transform).toBe('none');
    expect(window.sessionStorage.getItem('skipProfileAnimationOnce')).toBeNull();
  });

  it('Vite-режим: с gsap строится timeline и запускаются fromTo', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    document.body.innerHTML = MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(gsapMock.timeline).toHaveBeenCalledTimes(1);
    expect(gsapMock.timeline).toHaveBeenCalledWith({
      defaults: { duration: 0.6, ease: 'power3.out' },
    });

    const calls = gsapMock.tl.fromTo.mock.calls;
    expect(calls.length).toBe(2);
    // первая fromTo — выезд avatar-блока слева
    expect(calls[0][0]).toBe(document.getElementById('blcok-avatar'));
    expect(calls[0][1]).toEqual({ x: -100, opacity: 0 });
    // вторая — стаггер информационных блоков (4 элемента)
    expect(calls[1][0].length).toBe(4);
    expect(calls[1][1]).toEqual({ scale: 0.8, opacity: 0, transformOrigin: 'center center' });
  });

  it('Vite-режим: выбор изображения создаёт превью-аватар', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.createObjectURL = createObjectURL;
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const input = document.getElementById('avatar');
    const file = new window.File(['abc'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));

    const img = document.querySelector('.profile-avatar');
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(img).toBeTruthy();
    expect(img.src).toBe('blob:mock');
    expect(img.classList.contains('profile-avatar-fallback')).toBe(false);
  });
});
