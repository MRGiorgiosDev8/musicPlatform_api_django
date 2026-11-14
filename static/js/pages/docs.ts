(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.docs-section, .docs-hero'));
  if (!sections.length) return;

  if (typeof window.bootstrap !== 'undefined' && window.bootstrap.ScrollSpy) {
    window.bootstrap.ScrollSpy.getOrCreateInstance(document.body, { target: '#docsNav', offset: 120 });
  }

  document.querySelectorAll<HTMLAnchorElement>('.docs-nav a[href^="#"], .docs-endnote a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', link.hash);
    });
  });

  if (reduceMotion || typeof window.gsap === 'undefined') return;
  sections.forEach((section) => section.classList.add('docs-animate'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      window.gsap.to(entry.target, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  sections.forEach((section) => observer.observe(section));
})();

export {};
