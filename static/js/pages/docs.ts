(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readme = document.querySelector<HTMLElement>('.readme-content');
  if (!readme) return;
  const sections = Array.from(readme.querySelectorAll<HTMLElement>('h1, h2, h3, h4'));

  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.docs-nav a[href^="#"]'));

  if (typeof window.bootstrap !== 'undefined' && window.bootstrap.ScrollSpy) {
    const currentScrollSpy = window.bootstrap.ScrollSpy.getInstance(document.body);
    currentScrollSpy?.dispose();
    new window.bootstrap.ScrollSpy(document.body, { target: '#docsNav .docs-nav', offset: 120 });
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

  // Keep the visual state reliable when anchors are nested inside README headings.
  const syncActiveLink = () => {
    const current = navLinks
      .map((link) => ({ link, target: document.querySelector<HTMLElement>(link.hash) }))
      .filter((item): item is { link: HTMLAnchorElement; target: HTMLElement } => Boolean(item.target))
      .filter((item) => item.target.getBoundingClientRect().top <= 128)
      .at(-1);
    navLinks.forEach((link) => {
      const isActive = current?.link === link;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };
  syncActiveLink();
  window.addEventListener('scroll', syncActiveLink, { passive: true });

  if (reduceMotion || typeof window.gsap === 'undefined' || !sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      window.gsap.fromTo(entry.target, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  sections.forEach((section) => observer.observe(section));
})();

export {};
