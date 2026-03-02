document.addEventListener('DOMContentLoaded', () => {
  const hamburgerTogglers = document.querySelectorAll('.hamburger.hamburger--elastic');

  hamburgerTogglers.forEach((toggler) => {
    toggler.addEventListener('click', () => {
      toggler.classList.toggle('is-active');
    });
  });
});
