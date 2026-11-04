/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const createGsapMock = () => {
  const timeline = { to: vi.fn(() => timeline), fromTo: vi.fn(() => timeline) };
  return {
    killTweensOf: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => timeline),
    timelineInstance: timeline,
  };
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete window.gsap;
  delete window.PublicCommentsAnimation;
  window.matchMedia = vi.fn(() => ({ matches: false }));
});

afterEach(() => {
  delete window.gsap;
  delete window.PublicCommentsAnimation;
  document.body.innerHTML = '';
});

describe('public_comments_animation — оба режима загрузки', () => {
  it('Vite-режим: без gsap методы деградируют к DOM-записи и onComplete', async () => {
    await import('../../static/js/animation/public_comments_animation.ts');
    const node = document.createElement('div');
    node.textContent = '1';
    const done = vi.fn();

    window.PublicCommentsAnimation.pulseNewComment(node);
    window.PublicCommentsAnimation.collapseDeleteComment(null, done);
    expect(done).toHaveBeenCalledTimes(1);

    window.PublicCommentsAnimation.flipCommentsCount(node, 4);
    expect(node.textContent).toBe('4');

    window.PublicCommentsAnimation.animateStatCount(node, '12');
    expect(node.textContent).toBe('12');
    expect(node.dataset.countValue).toBe('12');
  });

  it('Vite-режим: с gsap вызывает pulse/collapse/flip/stat', async () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    await import('../../static/js/animation/public_comments_animation.ts');

    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetHeight', { configurable: true, value: 40 });
    node.textContent = '2';
    node.dataset.countValue = '2';

    window.PublicCommentsAnimation.pulseNewComment(node);
    expect(gsapMock.killTweensOf).toHaveBeenCalledWith(node);
    expect(gsapMock.fromTo).toHaveBeenCalled();
    expect(gsapMock.fromTo.mock.calls[0][2]).toMatchObject({
      duration: 0.42,
      ease: 'power2.out',
      clearProps: 'backgroundColor',
    });

    const done = vi.fn();
    window.PublicCommentsAnimation.collapseDeleteComment(node, done);
    expect(gsapMock.set).toHaveBeenCalledWith(node, expect.objectContaining({ height: 40 }));
    expect(gsapMock.timeline).toHaveBeenCalled();
    const collapseCfg = gsapMock.timeline.mock.calls[0][0];
    collapseCfg.onComplete();
    expect(done).toHaveBeenCalledTimes(1);

    window.PublicCommentsAnimation.flipCommentsCount(node, 9);
    const flipTo =
      gsapMock.timelineInstance.to.mock.calls[gsapMock.timelineInstance.to.mock.calls.length - 1];
    flipTo[1].onComplete();
    expect(node.textContent).toBe('9');

    window.PublicCommentsAnimation.animateStatCount(node, 15);
    const tweenCall = gsapMock.to.mock.calls.find((call) => call[1].duration === 0.6);
    tweenCall[1].onUpdate();
    tweenCall[1].onComplete();
    expect(node.textContent).toBe('15');
    expect(node.dataset.countValue).toBe('15');
  });

  it('Vite-режим: reduced-motion сразу вызывает onComplete collapse', async () => {
    window.gsap = createGsapMock();
    window.matchMedia = vi.fn(() => ({ matches: true }));
    await import('../../static/js/animation/public_comments_animation.ts');
    const done = vi.fn();
    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetHeight', { value: 20 });
    window.PublicCommentsAnimation.collapseDeleteComment(node, done);
    expect(done).toHaveBeenCalledTimes(1);
    expect(window.gsap.timeline).not.toHaveBeenCalled();
  });
});
