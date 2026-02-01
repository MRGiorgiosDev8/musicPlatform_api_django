const Animations = {
  fadeUp(selector) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    gsap.fromTo(elements,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power2.out',
        overwrite: true
      }
    );
  },

  initLogo() {
    const logo = document.querySelector('.logo-img');
    if (logo) {
      gsap.to(logo, {
        scale: 1.011,
        duration: 0.3,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
        transformOrigin: 'center center'
      });
    }
  },

  animateHeader() {
    gsap.fromTo('.popular-h2',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }
};

document.addEventListener('trending:rendered', () => Animations.fadeUp('#trending-container .card-custom'));
document.addEventListener('year2025:rendered', () => Animations.fadeUp('#year2025-container .card-year'));

document.addEventListener('DOMContentLoaded', () => {
  Animations.initLogo();
  Animations.animateHeader();

  setTimeout(() => {
    Animations.fadeUp('#trending-container .card-custom');
    Animations.fadeUp('#year2025-container .card-year');
  }, 200);
});