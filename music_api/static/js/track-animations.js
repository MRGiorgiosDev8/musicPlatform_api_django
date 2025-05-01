document.addEventListener('DOMContentLoaded', function() {
  const animateTracks = (items) => {
    if (typeof anime === 'undefined') {
      console.error('anime.js не загружена');
      return;
    }

    anime({
      targets: items,
      translateY: [100, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutQuad',
      delay: anime.stagger(150),
      begin: function() {
        items.forEach(item => {
          item.style.visibility = 'visible';
        });
      }
    });
  };

  const initTrackAnimations = () => {
    const resultsContainer = document.getElementById('searchResults');

    const existingItems = document.querySelectorAll('.track-item');
    if (existingItems.length > 0) {
      animateTracks(existingItems);
    }

    if (resultsContainer) {
      new MutationObserver((mutations) => {
        const newItems = [];
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.classList.contains('track-item')) {
                newItems.push(node);
              }
              const children = node.querySelectorAll('.track-item');
              children.forEach(child => newItems.push(child));
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
    }
  };

  const checkAnime = () => {
    if (typeof anime !== 'undefined') {
      initTrackAnimations();
    } else {
      setTimeout(checkAnime, 100);
    }
  };

  checkAnime();
});