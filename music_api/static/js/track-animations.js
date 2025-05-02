document.addEventListener('DOMContentLoaded', function() {
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
      delay: anime.stagger(150, {start: 300}),
      begin: function() {
        items.forEach(item => item.style.visibility = 'visible');
      }
    });
  };

  const initAnimations = () => {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    const header = resultsContainer.querySelector('h2');
    if (header) {
      animateHeader(header);
    }

    const existingItems = document.querySelectorAll('.track-item');
    if (existingItems.length > 0) {
      animateTracks(existingItems);
    }

    new MutationObserver((mutations) => {
      const newItems = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.nodeName === 'H2') {
              animateHeader(node);
            }
            if (node.classList.contains('track-item')) {
              newItems.push(node);
            }
            node.querySelectorAll('.track-item').forEach(item => newItems.push(item));
          }
        });
      });

      if (newItems.length > 0) {
        animateTracks(newItems);
      }
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