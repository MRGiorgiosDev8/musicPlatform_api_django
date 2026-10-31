/**
 * Кнопки горизонтальной прокрутки каруселей (жанровые плитки на главной).
 *
 * Side-effect модуль: вся работа — в DOMContentLoaded-обработчике. Использует
 * gsap + ScrollToPlugin (vendor, загружаются классическими script-тегами).
 * В window ничего не пишет, CJS-моста нет.
 */

// ScrollToPlugin — глобал из static/vendor/gsap (classic script), вне
// globals.d.ts; объявляем локально как `any`, чтобы не править globals.d.ts.
declare const ScrollToPlugin: any;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
    gsap.registerPlugin(ScrollToPlugin);
  }

  document.querySelectorAll<HTMLElement>('.carousel-wrapper').forEach((wrapper) => {
    const container = wrapper.querySelector<HTMLElement>('.d-flex.overflow-auto');
    const btnLeft = wrapper.querySelector<HTMLElement>('.scroll-left');
    const btnRight = wrapper.querySelector<HTMLElement>('.scroll-right');
    if (!container || !btnLeft || !btnRight) return;

    const firstItem = container.querySelector<HTMLElement>('.genre-btn');
    if (!firstItem) return;

    const animateSnap = (direction: number) => {
      const style = window.getComputedStyle(container);
      const gap = parseInt(style.columnGap || style.getPropertyValue('gap') || '0');
      const step = firstItem.offsetWidth + gap;

      const scrollAmount = step * 2;

      const currentScroll = container.scrollLeft;
      let targetX = currentScroll + direction * scrollAmount;

      targetX = Math.round(targetX / step) * step;

      gsap.to(container, {
        duration: 0.7,
        scrollTo: { x: targetX },
        ease: 'back.out(1.1)',
        overwrite: 'auto',
      });
    };

    btnLeft.addEventListener('click', (e) => {
      e.preventDefault();
      animateSnap(-1);
    });

    btnRight.addEventListener('click', (e) => {
      e.preventDefault();
      animateSnap(1);
    });

    container.addEventListener(
      'wheel',
      (e) => {
        if (window.innerWidth > 1024 && Math.abs(e.deltaX) > 0) {
        }
      },
      { passive: true }
    );
  });
});
