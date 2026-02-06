gsap.registerPlugin(DrawSVGPlugin);

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function createLiquidSpinner(container) {
    if (!container) return null;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('liquid-spinner');

    const circles = [];
    const numCircles = 8;
    const radius = 35;
    const centerX = 50;
    const centerY = 50;
    const circleRadius = 5;

    for (let i = 0; i < numCircles; i++) {
      const angle = (i / numCircles) * 2 * Math.PI;
      const cx = centerX + radius * Math.cos(angle);
      const cy = centerY + radius * Math.sin(angle);

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', circleRadius);
      circle.setAttribute('fill', 'currentColor');
      circle.style.opacity = 0.3;
      svg.appendChild(circle);
      circles.push(circle);
    }

    container.appendChild(svg);

    gsap.set(svg, { scale: 1, opacity: 1, transformOrigin: '50% 50%' });

    const circlesTl = gsap.timeline({ repeat: -1 });
    circles.forEach((circle, i) => {
      circlesTl.to(
        circle,
        {
          scale: 1.5,
          opacity: 1,
          duration: 0.3,
          ease: 'sine.out',
          transformOrigin: '50% 50%',
        },
        i * 0.15
      );
      circlesTl.to(
        circle,
        {
          scale: 1,
          opacity: 0.3,
          duration: 0.3,
          ease: 'sine.out',
        },
        i * 0.15 + 0.6
      );
    });

    const scaleTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut', duration: 0.6 } });
    scaleTl.to(svg, { scale: 1.2 });

    return {
      show() {
        container.hidden = false;
        gsap.killTweensOf(container);
        gsap.to(container, { opacity: 1, duration: 0.5, ease: 'power1.out' });
      },
      hide() {
        gsap.killTweensOf(container);
        gsap.to(container, {
          opacity: 0,
          duration: 0.5,
          ease: 'power1.in',
          onComplete() {
            container.hidden = true;
          },
        });
      },
      destroy() {
        circlesTl.kill();
        scaleTl.kill();
        svg.remove();
      },
    };
  }

  window.Spinners = {
    trending: createLiquidSpinner(document.getElementById('trending-spinner')),
    year: createLiquidSpinner(document.getElementById('year-spinner')),
    search: createLiquidSpinner(document.getElementById('searchLoader')),
  };
})();