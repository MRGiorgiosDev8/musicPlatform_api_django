(function () {
  'use strict';

  const REVEAL_DURATION = 0.4;
  const HIDE_DURATION = 0.35;
  const EASE_REVEAL = 'power3.out';
  const EASE_HIDE = 'expo.out';

  function getCoverRadius(rect, cx, cy) {
    const w = rect.width;
    const h = rect.height;
    const d1 = Math.sqrt(cx * cx + cy * cy);
    const d2 = Math.sqrt((w - cx) * (w - cx) + cy * cy);
    const d3 = Math.sqrt(cx * cx + (h - cy) * (h - cy));
    const d4 = Math.sqrt((w - cx) * (w - cx) + (h - cy) * (h - cy));
    return Math.max(d1, d2, d3, d4) + 1;
  }

  function revealAt(btn, clientX, clientY) {
    const reveal = btn.querySelector('.genre-btn-reveal');
    if (!reveal || typeof gsap === 'undefined') return;

    const rect = btn.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const radius = getCoverRadius(rect, cx, cy);
    const diameter = radius * 2;
    const left = cx - radius;
    const top = cy - radius;

    gsap.set(reveal, {
      width: diameter,
      height: diameter,
      left: left,
      top: top,
      scale: 0,
      transformOrigin: 'center center',
    });

    gsap.killTweensOf(reveal);
    gsap.to(reveal, {
      scale: 1,
      duration: REVEAL_DURATION,
      ease: EASE_REVEAL,
      overwrite: true,
    });
  }

  function hideReveal(btn) {
    const reveal = btn.querySelector('.genre-btn-reveal');
    if (!reveal || typeof gsap === 'undefined') return;

    gsap.killTweensOf(reveal);
    gsap.to(reveal, {
      scale: 0,
      duration: HIDE_DURATION,
      ease: EASE_HIDE,
      overwrite: true,
    });
  }

  function getButtonCenter(btn) {
    const rect = btn.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function isTouchDevice() {
    return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function revealAtCenter(btn) {
    const center = getButtonCenter(btn);
    revealAt(btn, center.x, center.y);
  }

  function setupDesktopButton(btn) {
    btn.addEventListener('mouseenter', function (e) {
      revealAt(btn, e.clientX, e.clientY);
    });

    btn.addEventListener('mouseleave', function () {
      hideReveal(btn);
    });
  }

  function setupMobileButton(btn) {
    // Обработчики вешаются в utils.js при изменении класса .active
  }

  function setupButton(btn) {
    const reveal = btn.querySelector('.genre-btn-reveal');
    if (!reveal) return;

    if (isTouchDevice()) {
      setupMobileButton(btn);
    } else {
      setupDesktopButton(btn);
    }
  }

  window.animateGenreBtn = function (btn, _idx) {
    if (!btn || !btn.classList.contains('genre-btn')) return;
    setupButton(btn);
  };

  window.showActiveReveal = function(btn) {
    if (!btn || !isTouchDevice()) return;
    revealAtCenter(btn);
  };

  window.hideActiveReveal = function(btn) {
    if (!btn || !isTouchDevice()) return;
    hideReveal(btn);
  };

  function initAll() {
    document.querySelectorAll('.genre-btn').forEach(function (btn) {
      if (!btn.dataset.radialRevealInit) {
        btn.dataset.radialRevealInit = '1';
        setupButton(btn);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
