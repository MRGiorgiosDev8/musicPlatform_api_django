const Animations = {
  fadeUp(selector) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    gsap.fromTo(
      elements,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power2.out',
        overwrite: true,
      }
    );
  },

  animateHeader() {
    gsap.fromTo(
      '.popular-h2',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  },
};

const runFadeIfInViewport = (containerSelector, itemSelector) => {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const isNearViewport = rect.top < viewportHeight * 1.1 && rect.bottom > 0;
  if (isNearViewport) {
    Animations.fadeUp(itemSelector);
  }
};

document.addEventListener('trending:rendered', () => {
  runFadeIfInViewport('#trending-container', '#trending-container .card-custom');
});
document.addEventListener('year2025:rendered', () => {
  runFadeIfInViewport('#year2025-container', '#year2025-container .card-year');
});
document.addEventListener('publicPlaylists:rendered', () => {
  runFadeIfInViewport('#public-playlists-dashboard', '#public-playlists-dashboard .dashboard-card');
});

document.addEventListener('DOMContentLoaded', () => {
  Animations.animateHeader();

  if (typeof window.IntersectionObserver === 'undefined') {
    setTimeout(() => {
      Animations.fadeUp('#trending-container .card-custom');
      Animations.fadeUp('#year2025-container .card-year');
      Animations.fadeUp('#public-playlists-dashboard .dashboard-card');
    }, 200);
    return;
  }

  const seen = new Set();
  const observer = new window.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (seen.has(id)) return;
        seen.add(id);

        if (id === 'trending-container') {
          Animations.fadeUp('#trending-container .card-custom');
        } else if (id === 'year2025-container') {
          Animations.fadeUp('#year2025-container .card-year');
        } else if (id === 'public-playlists-dashboard') {
          Animations.fadeUp('#public-playlists-dashboard .dashboard-card');
        }
        observer.unobserve(entry.target);
      });
    },
    { root: null, rootMargin: '120px 0px', threshold: 0.05 }
  );

  ['trending-container', 'year2025-container', 'public-playlists-dashboard'].forEach((id) => {
    const node = document.getElementById(id);
    if (node) observer.observe(node);
  });
});
