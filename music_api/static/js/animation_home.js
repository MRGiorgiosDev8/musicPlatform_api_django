gsap.fromTo('.popular-h2',
  { scale: 0 },
  { scale: 1, duration: 0.6, ease: 'power3.inOut' }
);


function animateCards() {
  const cards = document.querySelectorAll('#trending-container .card-custom');
  if (!cards.length) return;

  gsap.fromTo(cards,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.inOut'
    }
  );
}

function animateYear2025() {
  const cards = document.querySelectorAll('#year2025-container .card-year');
  if (!cards.length) return;

  gsap.fromTo(cards,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.inOut'
    }
  );
}

document.addEventListener('trending:rendered', animateCards);
document.addEventListener('year2025:rendered', animateYear2025);

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(animateCards, 150);
  setTimeout(animateYear2025, 250);
});