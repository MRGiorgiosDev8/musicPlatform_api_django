/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/animation/artist_bio_modal_close_animation.ts';

const MARKUP = `
  <div id="artistBioModal">
    <div class="modal-dialog">
      <div class="modal-content"></div>
    </div>
  </div>
`;

const createGsapMock = () => {
  const tl = { to: vi.fn() };
  return { set: vi.fn(), killTweensOf: vi.fn(), timeline: vi.fn(() => tl), tl };
};

afterEach(() => {
  delete window.gsap;
  delete window.bootstrap;
  document.body.innerHTML = '';
});

describe('artist_bio_modal_close_animation — оба режима загрузки', () => {
  it('Vite-режим: hide.bs.modal анимирует закрытие, onComplete прячет модалку с флагом', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    const hide = vi.fn();
    function Modal() {}
    Modal.getInstance = vi.fn(() => ({ hide }));
    window.bootstrap = { Modal };
    document.body.innerHTML = MARKUP;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const modal = document.getElementById('artistBioModal');
    const content = modal.querySelector('.modal-content');

    const firstHide = new Event('hide.bs.modal', { cancelable: true });
    const preventDefault = vi.spyOn(firstHide, 'preventDefault');
    modal.dispatchEvent(firstHide);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(gsapMock.killTweensOf).toHaveBeenCalledWith([content]);

    const timelineConfig = gsapMock.timeline.mock.calls[0][0];
    expect(timelineConfig.defaults).toEqual({ duration: 0.34, ease: 'back.in(1.7)' });
    expect(typeof timelineConfig.onComplete).toBe('function');

    expect(gsapMock.tl.to).toHaveBeenCalledTimes(1);
    expect(gsapMock.tl.to.mock.calls[0][0]).toEqual([content]);
    expect(gsapMock.tl.to.mock.calls[0][1]).toMatchObject({ scale: 0.5, opacity: 0 });
    expect(gsapMock.tl.to.mock.calls[0][2]).toBe(0);

    // завершаем timeline → getInstance + флаг + hide()
    timelineConfig.onComplete();
    expect(window.bootstrap.Modal.getInstance).toHaveBeenCalledWith(modal);
    expect(modal.dataset.gsapClosing).toBe('1');
    expect(hide).toHaveBeenCalledTimes(1);

    // повторный hide с выставленным флагом — без preventDefault и без новой анимации
    const secondHide = new Event('hide.bs.modal', { cancelable: true });
    const preventDefault2 = vi.spyOn(secondHide, 'preventDefault');
    modal.dispatchEvent(secondHide);

    expect(preventDefault2).not.toHaveBeenCalled();
    expect(gsapMock.tl.to).toHaveBeenCalledTimes(1);
    expect(modal.dataset.gsapClosing).toBeUndefined();
  });

  it('Vite-режим: hidden.bs.modal сбрасывает анимированные стили', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    function Modal() {}
    Modal.getInstance = vi.fn(() => null);
    window.bootstrap = { Modal };
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const modal = document.getElementById('artistBioModal');
    modal.dispatchEvent(new Event('hidden.bs.modal'));

    const dialog = modal.querySelector('.modal-dialog');
    const content = modal.querySelector('.modal-content');
    expect(gsapMock.set).toHaveBeenCalledWith([dialog, content], {
      clearProps: 'transform,opacity,filter,backdropFilter,boxShadow',
    });
  });

  it('Vite-режим: без gsap обработчики не навешиваются', () => {
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const event = new Event('hide.bs.modal', { cancelable: true });
    document.getElementById('artistBioModal').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('Vite-режим: без bootstrap.Modal обработчики не навешиваются', () => {
    window.gsap = createGsapMock();
    document.body.innerHTML = MARKUP;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const event = new Event('hide.bs.modal', { cancelable: true });
    document.getElementById('artistBioModal').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
