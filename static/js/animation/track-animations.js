(function () {
  const LOGO_ANIM_SESSION_KEY = 'logoAnimated';

  function hasLogoAnimatedInSession() {
    try {
      return sessionStorage.getItem(LOGO_ANIM_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function markLogoAnimatedInSession() {
    try {
      sessionStorage.setItem(LOGO_ANIM_SESSION_KEY, 'true');
    } catch {}
  }

  function clearLogoAnimatedInSession() {
    try {
      sessionStorage.removeItem(LOGO_ANIM_SESSION_KEY);
    } catch {}
  }

  function initLogoHeader() {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const fullText = logoText.textContent.trim();
    const firstPartText = fullText.substring(0, 9);
    const lastPartText = fullText.substring(9);

    logoText.innerHTML = `
      <span class="logo-first-part">${firstPartText}</span>
      <span class="logo-last-part">${lastPartText}</span>
    `;

    const firstPart = logoText.querySelector('.logo-first-part');
    const lastPart = logoText.querySelector('.logo-last-part');

    if (hasLogoAnimatedInSession()) {
      gsap.set(firstPart, { clearProps: 'all' });
      gsap.set(lastPart, { clearProps: 'all' });
      return;
    }

    const splitLast = new SplitText(lastPart, { type: 'chars' });

    const mainTl = gsap.timeline({ delay: 0.4 });

    mainTl.to(firstPart, {
      duration: 1.5,
      scrambleText: {
        text: firstPartText,
        chars: '♬♪',
        speed: 0.5,
        revealDelay: 0.2,
      },
      ease: 'power3.out',
    });

    gsap.set(splitLast.chars, { opacity: 0, y: 30 });

    mainTl.to(
      splitLast.chars,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
        stagger: 0.1,
      },
      '-=0.8'
    );

    const header = document.querySelector('#searchResults h2');
    if (header) {
      mainTl.fromTo(header, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3');
    }

    markLogoAnimatedInSession();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
      navbarBrand.addEventListener('click', clearLogoAnimatedInSession);
    }
    initLogoHeader();
  });
})();
