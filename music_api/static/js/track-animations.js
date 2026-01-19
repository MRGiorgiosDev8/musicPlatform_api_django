document.addEventListener('DOMContentLoaded', function() {
  const animateLogoText = () => {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const originalText = logoText.textContent;
    logoText.innerHTML = '';

    originalText.split('').forEach((char, index) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'logo-letter';
      letterSpan.textContent = char === ' ' ? '\u00A0' : char; // &nbsp; как символ
      Object.assign(letterSpan.style, {
        display: 'inline-block',
        transformOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
        opacity: '0',
        transform: 'rotateX(90deg)',
        verticalAlign: 'top'
      });
      logoText.appendChild(letterSpan);
    });

    anime({
      targets: '.logo-letter',
      rotateX: [90, 0],
      opacity: [0, 1],
      duration: 1000,
      delay: anime.stagger(80, { start: 300 }),
      easing: 'easeOutElastic(1, 0.6)',
      complete: function() {
        logoText.textContent = originalText;
      }
    });
  };

  const animateHeader = (header) => {
    if (!header) return;

    header.style.opacity = '0';
    header.style.transform = 'translateY(-100px)';
    header.style.willChange = 'transform, opacity';

    anime({
      targets: header,
      translateY: [-100, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutQuint'
    });
  };

  const animateTracks = (items) => {
    anime({
      targets: items,
      translateY: [140, 0],
      opacity: [1, 1],
      duration: 600,
      easing: 'easeOutQuad',
      delay: anime.stagger(150, { start: 300 }),
      begin: function() {
        items.forEach(item => {
          item.style.visibility = 'visible';

          // Стрелка не трогаем и события hover упрощаем
          item.addEventListener('mouseenter', () => {
            anime({
              targets: item,
              translateY: -4,
              duration: 50,
              easing: 'easeOutQuad'
            });
          });

          item.addEventListener('mouseleave', () => {
            anime({
              targets: item,
              translateY: 0,
              duration: 50,
              easing: 'easeOutQuad'
            });
          });
        });
      }
    });
  };

  const animateAlert = (alert) => {
    if (!alert) return;

    alert.style.opacity = '0';
    alert.style.transform = 'scale(0.8)';
    alert.style.transformOrigin = 'center';

    anime({
      targets: alert,
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 500,
      easing: 'easeOutBack'
    });
  };

  const initAnimations = () => {
    animateLogoText();

    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    resultsContainer.querySelectorAll('.alert').forEach(alert => {
      animateAlert(alert);
    });

    const header = resultsContainer.querySelector('h2');
    if (header) {
      animateHeader(header);
    }

    const existingItems = document.querySelectorAll('.track-item');
    if (existingItems.length > 0) {
      animateTracks(existingItems);
    }

    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList.contains('alert')) {
              animateAlert(node);
            }
            if (node.nodeName === 'H2') {
              animateHeader(node);
            }
            if (node.classList.contains('track-item')) {
              animateTracks([node]);
            }
            node.querySelectorAll('.track-item').forEach(item => {
              animateTracks([item]);
            });
          }
        });
      });
    }).observe(resultsContainer, {
      childList: true,
      subtree: true
    });
  };

  const checkAnime = () => {
    if (typeof anime !== 'undefined') {
      initAnimations();
    } else {
      setTimeout(checkAnime, 100);
    }
  };

  checkAnime();
});