(function () {
  const SearchAnimations = {
    config: {
      y: -100,
      scale: 0.99,
      opacity: 0,
      duration: 0.3,
      ease: 'back.out(1.7)',
    },

    processItems(elements, timeline) {
      elements.forEach((item) => {
        if (!item || item.dataset.animated) return;

        gsap.set(item, {
          y: this.config.y,
          scale: this.config.scale,
          opacity: this.config.opacity,
        });

        timeline.to(item, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: this.config.duration,
          ease: this.config.ease,
        });

        item.dataset.animated = 'true';
      });
    },

    init() {
      const bodyObserver = new MutationObserver((mutations, obs) => {
        const container = document.getElementById('searchResults');
        if (!container) return;

        obs.disconnect();

        const queue = gsap.timeline({ delay: 0.25 });

        const initialItems = container.querySelectorAll('.track-item, .track-item-playlist');
        if (initialItems.length) {
          this.processItems(initialItems, queue);
        }

        const searchObserver = new MutationObserver((mutations) => {
          mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;

              const targets =
                node.classList.contains('track-item') ||
                node.classList.contains('track-item-playlist')
                  ? [node]
                  : node.querySelectorAll?.('.track-item, .track-item-playlist');

              if (targets && targets.length) {
                this.processItems(targets, queue);
              }
            });
          });
        });

        searchObserver.observe(container, { childList: true, subtree: true });
      });

      bodyObserver.observe(document.body, { childList: true, subtree: true });
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SearchAnimations.init());
  } else {
    SearchAnimations.init();
  }
})();
