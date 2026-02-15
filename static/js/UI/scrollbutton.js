document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== "undefined" && typeof ScrollToPlugin !== "undefined") {
    gsap.registerPlugin(ScrollToPlugin);
  }

  document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
    const container = wrapper.querySelector('.d-flex.overflow-auto');
    const btnLeft = wrapper.querySelector('.scroll-left');
    const btnRight = wrapper.querySelector('.scroll-right');
    if (!container || !btnLeft || !btnRight) return;

    const firstItem = container.querySelector('.genre-btn');
    if (!firstItem) return;

    const animateSnap = (direction) => {
      const style = window.getComputedStyle(container);
      const gap = parseInt(style.columnGap || style.getPropertyValue('gap') || 0);
      const step = firstItem.offsetWidth + gap;

      const scrollAmount = step * 2;

      const currentScroll = container.scrollLeft;
      let targetX = currentScroll + (direction * scrollAmount);

      targetX = Math.round(targetX / step) * step;

      gsap.to(container, {
        duration: 0.7,
        scrollTo: { x: targetX },
        ease: "back.out(1.1)",
        overwrite: "auto"
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

    container.addEventListener('wheel', (e) => {
      if (window.innerWidth > 1024 && Math.abs(e.deltaX) > 0) {
      }
    }, { passive: true });
  });
});
