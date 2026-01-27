if (typeof gsap !== "undefined" && typeof ScrollToPlugin !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin);
}

window.initChartScroll = function() {
  const btn = document.getElementById('goto-year-chart');
  const target = document.getElementById('year2026-chart');

  if (!btn || !target) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();

    gsap.to(window, {
      duration: 1.5,
      scrollTo: { y: target, offsetY: 20 },
      ease: "power2.inOut"
    });
  });
};


document.addEventListener('DOMContentLoaded', () => {
  window.initChartScroll();
});