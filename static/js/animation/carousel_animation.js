function animateGenreBtn(btn, idx) {
  if (typeof gsap === 'undefined' || !btn) return;

  gsap.fromTo(
    btn,
    { opacity: 0 },
    { opacity: 1, duration: 0.35, ease: 'power2.out', delay: idx * 0.08 }
  );
}