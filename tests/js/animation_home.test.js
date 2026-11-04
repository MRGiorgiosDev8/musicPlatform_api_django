/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует слушатели.
import '../../static/js/animation/animation_home.ts';

const CONTAINERS = `
  <div id="trending-container"><div class="card-custom"></div></div>
  <div id="year2025-container"><div class="card-year"></div></div>
  <div id="public-playlists-dashboard"><div class="dashboard-card"></div></div>
`;

const createGsapMock = () => ({
  fromTo: vi.fn(),
});

const createIntersectionObserverMock = (observed) => {
  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      FakeIntersectionObserver.lastInstance = this;
    }
    observe(el) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  }
  return FakeIntersectionObserver;
};

afterEach(() => {
  delete window.gsap;
  delete window.IntersectionObserver;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('animation_home — оба режима загрузки', () => {
  it('Vite-режим: с IntersectionObserver анимирует заголовок и наблюдает контейнеры', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    const observed = [];
    window.IntersectionObserver = createIntersectionObserverMock(observed);
    document.body.innerHTML = CONTAINERS;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    // заголовок анимируется сразу (первый аргумент — строка-селектор)
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);
    expect(gsapMock.fromTo.mock.calls[0][0]).toBe('.popular-h2');
    expect(gsapMock.fromTo.mock.calls[0][1]).toEqual({ scale: 0, opacity: 0 });

    // наблюдаются только существующие контейнеры (все три есть)
    expect(observed.map((el) => el.id)).toEqual([
      'trending-container',
      'year2025-container',
      'public-playlists-dashboard',
    ]);

    // пересечение контейнера: fadeUp передаёт в gsap найденные карточки
    window.IntersectionObserver.lastInstance.callback([
      { isIntersecting: true, target: document.getElementById('trending-container') },
    ]);
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(2);
    expect(Array.from(gsapMock.fromTo.mock.calls[1][0])).toEqual([
      document.querySelector('#trending-container .card-custom'),
    ]);

    // повторное пересечение того же контейнера игнорируется
    window.IntersectionObserver.lastInstance.callback([
      { isIntersecting: true, target: document.getElementById('trending-container') },
    ]);
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(2);
  });

  it('Vite-режим: без IntersectionObserver запускает запасную анимацию через setTimeout', () => {
    vi.useFakeTimers();
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    // IntersectionObserver в jsdom отсутствует по умолчанию
    document.body.innerHTML = CONTAINERS;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    // пока не прошло 200 мс — только заголовок
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);

    // заголовок + три fadeUp-вызова (каждый с NodeList найденных элементов)
    expect(gsapMock.fromTo).toHaveBeenCalledTimes(4);
    expect(Array.from(gsapMock.fromTo.mock.calls[1][0])).toEqual([
      document.querySelector('#trending-container .card-custom'),
    ]);
    expect(Array.from(gsapMock.fromTo.mock.calls[2][0])).toEqual([
      document.querySelector('#year2025-container .card-year'),
    ]);
    expect(Array.from(gsapMock.fromTo.mock.calls[3][0])).toEqual([
      document.querySelector('#public-playlists-dashboard .dashboard-card'),
    ]);
  });

  it('Vite-режим: события trending:/year2025:/publicPlaylists:rendered запускают fadeUp видимых карточек', () => {
    const gsapMock = createGsapMock();
    window.gsap = gsapMock;
    window.IntersectionObserver = createIntersectionObserverMock([]);
    document.body.innerHTML = CONTAINERS;
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // jsdom возвращает нулевой rect — подменяем, чтобы условие «рядом с вьюпортом» сработало
    vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 50,
      bottom: 200,
      left: 0,
      right: 0,
      width: 0,
      height: 150,
      x: 0,
      y: 50,
      toJSON: () => ({}),
    });

    const callsBefore = gsapMock.fromTo.mock.calls.length;

    document.dispatchEvent(new Event('trending:rendered'));
    document.dispatchEvent(new Event('year2025:rendered'));

    const targets = gsapMock.fromTo.mock.calls
      .slice(callsBefore)
      .map((call) => Array.from(call[0]));
    expect(
      targets.some((els) =>
        els.includes(document.querySelector('#trending-container .card-custom'))
      )
    ).toBe(true);
    expect(
      targets.some((els) => els.includes(document.querySelector('#year2025-container .card-year')))
    ).toBe(true);
  });
});
