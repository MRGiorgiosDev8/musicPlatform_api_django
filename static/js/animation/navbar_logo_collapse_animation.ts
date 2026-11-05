interface Window {
  gsap: any;
}

(() => {
  const initNavbarLogoCollapseAnimation = () => {
    const collapse = document.getElementById('navbarNav');
    const logoImage = document.querySelector('.logo-img');
    const logoText = document.querySelector('.logo-text');

    if (!collapse || !logoImage || typeof window.gsap === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const imageRect = logoImage.getBoundingClientRect();
    const expandedWidth = Math.round(imageRect.width) || 70;
    const expandedMarginRight =
      Number.parseFloat(window.getComputedStyle(logoImage).marginRight || '0') || 0;

    const resetExpandedState = () => {
      window.gsap.set(logoImage, {
        width: expandedWidth,
        marginRight: expandedMarginRight,
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
      });
      if (logoText) {
        window.gsap.set(logoText, {
          scale: 1,
          x: 0,
          transformOrigin: 'left center',
        });
      }
    };

    const setCollapsedState = () => {
      window.gsap.set(logoImage, {
        width: 0,
        marginRight: 0,
        opacity: 0,
        x: -8,
        pointerEvents: 'none',
      });
      if (logoText) {
        window.gsap.set(logoText, {
          scale: 1.08,
          x: 0,
          transformOrigin: 'left center',
        });
      }
    };

    const animateToCollapsed = () => {
      window.gsap.killTweensOf(logoImage);
      if (logoText) {
        window.gsap.killTweensOf(logoText);
      }
      window.gsap.to(logoImage, {
        duration: 0.32,
        ease: 'power2.out',
        width: 0,
        marginRight: 0,
        opacity: 0,
        x: -8,
        pointerEvents: 'none',
      });
      if (logoText) {
        window.gsap.to(logoText, {
          duration: 0.32,
          ease: 'back.out(1.2)',
          scale: 1.1,
          x: 0,
          transformOrigin: 'left center',
        });
      }
    };

    const animateToExpanded = () => {
      window.gsap.killTweensOf(logoImage);
      if (logoText) {
        window.gsap.killTweensOf(logoText);
      }
      window.gsap.to(logoImage, {
        duration: 0.32,
        ease: 'power2.out',
        width: expandedWidth,
        marginRight: expandedMarginRight,
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
      });
      if (logoText) {
        window.gsap.to(logoText, {
          duration: 0.32,
          ease: 'back.out(1)',
          scale: 1,
          x: 0,
          transformOrigin: 'left center',
        });
      }
    };

    const syncImmediateState = () => {
      if (prefersReducedMotion.matches) {
        if (collapse.classList.contains('show')) {
          setCollapsedState();
        } else {
          resetExpandedState();
        }
        return;
      }
      if (collapse.classList.contains('show')) {
        setCollapsedState();
      } else {
        resetExpandedState();
      }
    };

    collapse.addEventListener('show.bs.collapse', () => {
      if (prefersReducedMotion.matches) {
        setCollapsedState();
        return;
      }
      animateToCollapsed();
    });

    collapse.addEventListener('hide.bs.collapse', () => {
      if (prefersReducedMotion.matches) {
        resetExpandedState();
        return;
      }
      animateToExpanded();
    });

    window.addEventListener('resize', syncImmediateState, { passive: true });
    if (typeof prefersReducedMotion.addEventListener === 'function') {
      prefersReducedMotion.addEventListener('change', syncImmediateState);
    }

    syncImmediateState();
  };

  // Инициализация строго после стабилизации layout в WebKit/Safari.
  // При кэшированных ресурсах DOMContentLoaded может наступить до готового
  // layout, из-за чего gsap.set пиннит неверное начальное состояние
  // .logo-text / .logo-font img (лого "разлетается" при перезагрузке).
  // Ждём, пока другие модули закончат править navbar (покой мутаций DOM),
  // с гарантированным fallback на событие load.
  let initialized = false;
  let observer: MutationObserver | null = null;
  let settleTimer = 0;

  const initOnce = () => {
    if (initialized) return;
    initialized = true;
    observer?.disconnect();
    initNavbarLogoCollapseAnimation();
  };

  const initWhenStable = () => {
    if (document.readyState === 'complete') {
      // DOMContentLoaded и load уже прошли — layout готов
      initOnce();
      return;
    }
    observer = new MutationObserver(() => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(initOnce, 80);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // Гарантированный вызов, даже если DOM продолжает мутироваться
    window.addEventListener('load', initOnce);
  };

  initWhenStable();
})();

export {};
