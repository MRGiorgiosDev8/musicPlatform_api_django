(function () {
  function initLogoHeader() {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const originalText = logoText.textContent;
    logoText.innerHTML = '';
    originalText.split('').forEach(char => {
      const span = document.createElement('span');
      span.className = 'logo-letter';
      span.textContent = char === ' ' ? '\u00A0' : char;
      Object.assign(span.style, {
        display: 'inline-block',
        transformOrigin: '50% 50%',
        opacity: '0',
        transform: 'rotateX(90deg)',
      });
      logoText.appendChild(span);
    });

    window.gsap.to('.logo-letter', {
      rotateX: 0,
      opacity: 1,
      duration: 1,
      ease: 'elastic.out(1, 0.6)',
      stagger: { each: 0.08, start: 0.3 },
    });

    const header = document.querySelector('#searchResults h2');
    if (header) {
      window.gsap.fromTo(header,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogoHeader);
  } else {
    initLogoHeader();
  }
})();