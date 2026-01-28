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
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      }
    });
  });
});