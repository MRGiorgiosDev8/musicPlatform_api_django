(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readme = document.querySelector<HTMLElement>('.readme-content');
  if (!readme) return;
  const resolveHeading = (hash: string): HTMLElement | null => {
    const anchor = document.querySelector<HTMLElement>(hash);
    if (!anchor) return null;
    return anchor.matches('h1, h2, h3, h4')
      ? anchor
      : anchor.closest<HTMLElement>('h1, h2, h3, h4') || anchor;
  };

  const navLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.docs-nav a[href^="#"]')
  );
  const sidebar = document.querySelector<HTMLElement>('.docs-sidebar');
  const mobileToggle = document.querySelector<HTMLElement>('.docs-mobile-toggle');
  const floatingToggle = document.querySelector<HTMLElement>('#docsSidebarFloatingToggle');
  let preservedScrollY = window.scrollY;
  let pendingScrollY: number | null = null;

  if (mobileToggle && floatingToggle && 'IntersectionObserver' in window) {
    const toggleObserver = new IntersectionObserver(
      ([entry]) => {
        floatingToggle.classList.toggle('is-visible', !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    toggleObserver.observe(mobileToggle);
  }

  if (sidebar) {
    sidebar.addEventListener('hide.bs.offcanvas', () => {
      preservedScrollY = pendingScrollY ?? window.scrollY;
    });
    sidebar.addEventListener('hidden.bs.offcanvas', () => {
      const targetScrollY = pendingScrollY ?? preservedScrollY;
      pendingScrollY = null;
      window.scrollTo({ top: targetScrollY, behavior: 'auto' });
      window.setTimeout(() => window.scrollTo({ top: targetScrollY, behavior: 'auto' }), 120);
    });
  }

  if (typeof window.bootstrap !== 'undefined' && window.bootstrap.ScrollSpy) {
    const currentScrollSpy = window.bootstrap.ScrollSpy.getInstance(document.body);
    currentScrollSpy?.dispose();
    new window.bootstrap.ScrollSpy(document.body, { target: '#docsNav .docs-nav', offset: 120 });
  }

  document
    .querySelectorAll<HTMLAnchorElement>('.docs-nav a[href^="#"], .docs-endnote a[href^="#"]')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = resolveHeading(link.hash);
        if (!target) return;
        event.preventDefault();
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 120);
        const isMobile = window.matchMedia('(max-width: 991.98px)').matches;
        if (isMobile) {
          pendingScrollY = top;
          preservedScrollY = top;
          if (sidebar && typeof window.bootstrap !== 'undefined' && window.bootstrap.Offcanvas) {
            window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).hide();
          } else {
            window.scrollTo({ top, behavior: 'auto' });
          }
        } else {
          window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        history.replaceState(null, '', link.hash);
      });
    });

  // Keep the visual state reliable when anchors are nested inside README headings.
  const syncActiveLink = () => {
    const current = navLinks
      .map((link) => ({ link, target: resolveHeading(link.hash) }))
      .filter((item): item is { link: HTMLAnchorElement; target: HTMLElement } =>
        Boolean(item.target)
      )
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

  if (reduceMotion || typeof window.gsap === 'undefined') return;
  if (sidebar && window.matchMedia('(min-width: 992px)').matches) {
    window.gsap.fromTo(
      sidebar,
      { autoAlpha: 0, x: -12 },
      { autoAlpha: 1, x: 0, duration: 0.55, ease: 'power2.out' }
    );
  }
})();

export {};
