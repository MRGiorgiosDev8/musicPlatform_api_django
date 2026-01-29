(function () {
  function initTrackCards() {
    const observer = new MutationObserver((mutations, obs) => {
      const container = document.getElementById('searchResults');
      if (!container) return;

      obs.disconnect();

      const queue = window.gsap.timeline({ delay: 0.25 });

      function animateTrackItem(item) {
        if (item.dataset.animated) return;

        window.gsap.set(item, {
          y: -100,
          scale: 0.99,
          opacity: 0
        });

        queue.to(item, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.6)'
        });

        item.dataset.animated = 'true';
      }

      const items = Array.from(container.querySelectorAll('.track-item')).filter(
        item => !item.dataset.animated
      );

      items.forEach(item => {
        window.gsap.set(item, {
          y: -100,
          scale: 0.99,
          opacity: 0
        });

        queue.to(item, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.6)'
        });

        item.dataset.animated = 'true';
      });

      new MutationObserver(mutations =>
        mutations.forEach(m =>
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.classList.contains('track-item')) animateTrackItem(node);
            node.querySelectorAll?.('.track-item').forEach(animateTrackItem);
          })
        )
      ).observe(container, { childList: true, subtree: true });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrackCards);
  } else {
    initTrackCards();
  }
})();