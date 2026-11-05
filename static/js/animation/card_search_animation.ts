(function () {
  const SearchAnimations = {
    config: {
      y: -100,
      scale: 0.99,
      opacity: 0,
      duration: 0.3,
      ease: 'back.out(1.7)',
    },

    processItems(
      elements: ArrayLike<Element> & { forEach: (cb: (item: Element) => void) => void },
      timeline: { to: (...args: unknown[]) => unknown }
    ) {
      elements.forEach((item) => {
        if (!item || (item as HTMLElement).dataset.animated) return;

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

        (item as HTMLElement).dataset.animated = 'true';
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

        const searchObserver = new MutationObserver((mutationsList) => {
          mutationsList.forEach((m) => {
            m.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;

              const element = node as Element;
              const targets =
                element.classList.contains('track-item') ||
                element.classList.contains('track-item-playlist')
                  ? [element]
                  : element.querySelectorAll?.('.track-item, .track-item-playlist');

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

export {};
