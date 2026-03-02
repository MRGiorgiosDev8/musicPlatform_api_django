(() => {
  const hasGsap = typeof gsap !== 'undefined';

  const pulseNewComment = (node) => {
    if (!node || !hasGsap) {
      return;
    }
    const initialBackground = getComputedStyle(node).backgroundColor || '#ffffff';

    gsap.killTweensOf(node);
    gsap.fromTo(
      node,
      {
        scale: 0.98,
        backgroundColor: 'rgba(255, 13, 0, 0.16)',
      },
      {
        scale: 1,
        backgroundColor: initialBackground,
        duration: 0.42,
        ease: 'power2.out',
        clearProps: 'backgroundColor',
      }
    );
  };

  const collapseDeleteComment = (node, onComplete) => {
    if (!node) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }
    if (!hasGsap) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }

    gsap.killTweensOf(node);
    gsap.to(node, {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.28,
      ease: 'power2.inOut',
      onComplete: () => {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      },
    });
  };

  const flipCommentsCount = (node, nextValue) => {
    if (!node) {
      return;
    }
    const nextText = String(nextValue);
    if (!hasGsap) {
      node.textContent = nextText;
      return;
    }

    gsap.killTweensOf(node);
    const timeline = gsap.timeline();
    timeline.to(node, {
      y: -6,
      opacity: 0,
      duration: 0.14,
      ease: 'power1.in',
      onComplete: () => {
        node.textContent = nextText;
      },
    });
    timeline.fromTo(
      node,
      { y: 6, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }
    );
  };

  window.PublicCommentsAnimation = {
    pulseNewComment,
    collapseDeleteComment,
    flipCommentsCount,
  };
})();
