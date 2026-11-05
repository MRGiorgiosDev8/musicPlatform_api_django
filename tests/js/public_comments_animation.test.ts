/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

declare module '../../static/js/animation/public_comments_animation.ts' {
  export const pulseNewComment: any;
  export const collapseDeleteComment: any;
  export const flipCommentsCount: any;
  export const animateStatCount: any;
}

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
  (window as any).gsap = undefined;
  (window as any).PublicCommentsAnimation = undefined;
  (window as any).matchMedia = vi.fn(() => ({ matches: false }));
});

afterEach(() => {
  (window as any).gsap = undefined;
  (window as any).PublicCommentsAnimation = undefined;
  document.body.innerHTML = '';
});

describe('public_comments_animation — оба режима загрузки', () => {
  it('Vite-режим: без gsap методы деградируют к DOM-записи и onComplete', async () => {
    await import('../../static/js/animation/public_comments_animation.ts');
    const node = document.createElement('div');
    node.textContent = '1';
    const done = vi.fn();

    (window as any).PublicCommentsAnimation.pulseNewComment(node);
    (window as any).PublicCommentsAnimation.collapseDeleteComment(null, done);
    expect(done).toHaveBeenCalledTimes(1);

    (window as any).PublicCommentsAnimation.flipCommentsCount(node, 4);
    expect(node.textContent).toBe('4');

    (window as any).PublicCommentsAnimation.animateStatCount(node, '12');
    expect(node.textContent).toBe('12');
    expect(node.dataset.countValue).toBe('12');
  });

  it('Vite-режим: с gsap вызывает pulse/collapse/flip/stat', async () => {
    const gsapMock = createGsapMock();
    (window as any).gsap = gsapMock;
    await import('../../static/js/animation/public_comments_animation.ts');

    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetHeight', { configurable: true, value: 40 });
    node.textContent = '2';
    node.dataset.countValue = '2';

    (window as any).PublicCommentsAnimation.pulseNewComment(node);
    expect(gsapMock.killTweensOf).toHaveBeenCalledWith(node);
    expect(gsapMock.fromTo).toHaveBeenCalled();
    expect(gsapMock.fromTo.mock.calls[0][2]).toMatchObject({
      duration: 0.42,
      ease: 'power2.out',
      clearProps: 'backgroundColor',
    });

    const done = vi.fn();
    (window as any).PublicCommentsAnimation.collapseDeleteComment(node, done);
    expect(gsapMock.set).toHaveBeenCalledWith(node, expect.objectContaining({ height: 40 }));
    expect(gsapMock.timeline).toHaveBeenCalled();
    const collapseCfg = gsapMock.timeline.mock.calls[0] as any;
    if (collapseCfg && collapseCfg[0]) collapseCfg[0].onComplete();
    expect(done).toHaveBeenCalledTimes(1);

    (window as any).PublicCommentsAnimation.flipCommentsCount(node, 9);
    const flipTo = gsapMock.timelineInstance.to.mock.calls[
      gsapMock.timelineInstance.to.mock.calls.length - 1
    ] as any;
    if (flipTo && flipTo[1]) flipTo[1].onComplete();
    expect(node.textContent).toBe('9');

    (window as any).PublicCommentsAnimation.animateStatCount(node, 15);
    const tweenCall = gsapMock.to.mock.calls.find((call) => call[1].duration === 0.6);
    if (tweenCall) {
      tweenCall[1].onUpdate();
      tweenCall[1].onComplete();
    }
    expect(node.textContent).toBe('15');
    expect(node.dataset.countValue).toBe('15');
  });

  it('Vite-режим: reduced-motion сразу вызывает onComplete collapse', async () => {
    (window as any).gsap = createGsapMock();
    (window as any).matchMedia = vi.fn(() => ({ matches: true }));
    await import('../../static/js/animation/public_comments_animation.ts');
    const done = vi.fn();
    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetHeight', { value: 20 });
    (window as any).PublicCommentsAnimation.collapseDeleteComment(node, done);
    expect(done).toHaveBeenCalledTimes(1);
    expect((window as any).gsap.timeline).not.toHaveBeenCalled();
  });
});
