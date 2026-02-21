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

  animateHeader() {
    gsap.fromTo('.popular-h2',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }
};

document.addEventListener('trending:rendered', () => Animations.fadeUp('#trending-container .card-custom'));
document.addEventListener('year2025:rendered', () => Animations.fadeUp('#year2025-container .card-year'));
document.addEventListener('publicPlaylists:rendered', () => Animations.fadeUp('#public-playlists-dashboard .dashboard-card'));

document.addEventListener('DOMContentLoaded', () => {
  Animations.animateHeader();

  setTimeout(() => {
    Animations.fadeUp('#trending-container .card-custom');
    Animations.fadeUp('#year2025-container .card-year');
    Animations.fadeUp('#public-playlists-dashboard .dashboard-card');
  }, 200);
});
