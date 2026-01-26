document.addEventListener('DOMContentLoaded', () => {
  const animateLogoText = () => {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const originalText = logoText.textContent;
    logoText.innerHTML = '';

    originalText.split('').forEach((char) => {
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

    gsap.to('.logo-letter', {
      rotateX: 0,
      opacity: 1,
      duration: 1,
      ease: 'elastic.out(1, 0.6)',
      stagger: {
        each: 0.08,
        start: 0.3,
      },
    });
  };

  const animateHeader = (header) => {
    if (!header) return;
    gsap.fromTo(header,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  };

  const animateTracks = (items) => {
    items.forEach(item => item.style.visibility = 'visible');

    gsap.fromTo(items,
      { y: 140, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.15 }
    );

    items.forEach(item => {
      item.addEventListener('mouseenter', () => gsap.to(item, { y: -4, duration: 0.05, ease: 'power2.out' }));
      item.addEventListener('mouseleave', () => gsap.to(item, { y: 0, duration: 0.05, ease: 'power2.out' }));
    });
  };

  const animateAlert = (alert) => {
    if (!alert) return;
    gsap.fromTo(alert,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
    );
  };

  const initAnimations = () => {
    animateLogoText();

    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    const header = resultsContainer.querySelector('h2');
    if (header) animateHeader(header);

    const tracks = resultsContainer.querySelectorAll('.track-item');
    if (tracks.length) animateTracks(tracks);

    const alerts = resultsContainer.querySelectorAll('.alert');
    if (alerts.length) animateAlert(alerts);

    new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;

          if (node.classList.contains('alert')) animateAlert(node);
          if (node.nodeName === 'H2') animateHeader(node);
          if (node.classList.contains('track-item')) animateTracks([node]);
          node.querySelectorAll('.track-item').forEach(item => animateTracks([item]));
        });
      });
    }).observe(resultsContainer, { childList: true, subtree: true });
  };

  initAnimations();
});