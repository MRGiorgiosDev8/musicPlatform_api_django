document.addEventListener('DOMContentLoaded', () => {
  const animateLogoText = () => {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const originalText = logoText.textContent;
    console.log('Animating logo text with letters count:', originalText.length);
    logoText.innerHTML = '';

    originalText.split('').forEach((char) => {
      const span = document.createElement('span');
      span.className = 'logo-letter';
      span.textContent = char === ' ' ? '\u00A0' : char;
      logoText.appendChild(span);
    });

    gsap.set('.logo-letter', {opacity: 0, rotateX: 90, transformOrigin: '50% 50%'});
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
    console.log('Animating header:', header);
    gsap.fromTo(header,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  };

  const animateAlert = (alert) => {
    if (!alert) return;
    gsap.fromTo(alert,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
    );
  };

  const animateTrackItem = (item) => {
    if (item.dataset.animated) return;
    item.dataset.animated = 'true';
    console.log('Animating new track item:', item);
    gsap.fromTo(item,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );

    item.addEventListener('mouseenter', () => {
      gsap.to(item, { y: -4, duration: 0.05, ease: 'power2.out' });
    });
    item.addEventListener('mouseleave', () => {
      gsap.to(item, { y: 0, duration: 0.05, ease: 'power2.out' });
    });
  };

  const initAnimations = () => {
    animateLogoText();

    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    const header = resultsContainer.querySelector('h2');
    if (header) animateHeader(header);

    const alerts = resultsContainer.querySelectorAll('.alert');
    if (alerts.length) alerts.forEach(alert => animateAlert(alert));

    const existingTracks = resultsContainer.querySelectorAll('.track-item');
    existingTracks.forEach(item => animateTrackItem(item));

    new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;

          if (node.classList.contains('alert')) animateAlert(node);
          if (node.nodeName === 'H2') animateHeader(node);

          if (node.classList.contains('track-item')) {
            animateTrackItem(node);
          }

          const nestedTracks = node.querySelectorAll('.track-item');
          nestedTracks.forEach(item => {
            animateTrackItem(item);
          });
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  };

  initAnimations();
});