document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;

  const widgets = document.querySelectorAll('.auth-widget, .signup-widget');
  if (!widgets.length) return;

  gsap.fromTo(
    widgets,
    { scale: 0.8, opacity: 0, transformOrigin: '50% 50%' },
    { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' }
  );
});
