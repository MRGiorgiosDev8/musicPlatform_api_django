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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }

    const fullHeight = node.offsetHeight;
    if (!fullHeight) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }

    gsap.killTweensOf(node);
    gsap.set(node, {
      height: fullHeight,
      overflow: 'hidden',
      transformOrigin: '50% 0%',
      willChange: 'height,opacity,transform,filter',
    });

    const timeline = gsap.timeline({
      onComplete: () => {
        gsap.set(node, { clearProps: 'all' });
        if (typeof onComplete === 'function') {
          onComplete();
        }
      },
    });

    timeline.to(node, {
      opacity: 0,
      x: 11,
      scaleY: 0.97,
      filter: 'blur(1.5px)',
      duration: 0.18,
      ease: 'power2.in',
    });

    timeline.to(
      node,
      {
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        duration: 0.2,
        ease: 'power2.inOut',
      },
      '-=0.02'
    );
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
    animateStatCount: (node, nextValue) => {
      if (!node) return;
      const nextNumber = Number(nextValue) || 0;
      const currentNumber = Number(node.dataset.countValue || node.textContent) || 0;
      if (!hasGsap) {
        node.textContent = String(nextNumber);
        node.dataset.countValue = String(nextNumber);
        return;
      }

      gsap.killTweensOf(node);
      const tweenState = { value: currentNumber };

      gsap.fromTo(
        node,
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }
      );

      gsap.to(tweenState, {
        value: nextNumber,
        duration: 0.6,
        ease: 'power1.out',
        onUpdate: () => {
          node.textContent = String(Math.round(tweenState.value));
        },
        onComplete: () => {
          node.textContent = String(nextNumber);
          node.dataset.countValue = String(nextNumber);
        },
      });
    },
  };
})();
