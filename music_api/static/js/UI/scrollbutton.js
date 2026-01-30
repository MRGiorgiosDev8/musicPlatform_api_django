document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
    const container = wrapper.querySelector('.d-flex.overflow-auto');
    const btnLeft = wrapper.querySelector('.scroll-left');
    const btnRight = wrapper.querySelector('.scroll-right');

    const scrollAmount = 200;

    btnLeft.addEventListener('click', () => {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    btnRight.addEventListener('click', () => {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    container.addEventListener('wheel', (e) => {
      if (window.innerWidth > 768) {
        e.preventDefault();
      }
    }, { passive: false });

    container.addEventListener('touchmove', e => {
      if (window.innerWidth > 768) {
        e.preventDefault();
      }
    }, { passive: false });
  });
});