
gsap.fromTo('.popular-h2',
  { scale: 0 },
  { scale: 1, duration: 0.6, ease: 'power3.inOut'}
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

document.addEventListener('trending:rendered', animateCards);

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(animateCards, 150);
});