document.addEventListener('DOMContentLoaded', () => {
  const actions = document.querySelectorAll('.avatar-actions');
  if (!actions.length) {
    return;
  }

  actions.forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) {
      return;
    }

    summary.addEventListener('click', (event) => {
      if (!details.hasAttribute('open')) {
        return;
      }
      if (details.classList.contains('is-closing')) {
        return;
      }

      event.preventDefault();
      details.classList.add('is-closing');
      window.setTimeout(() => {
        details.removeAttribute('open');
        details.classList.remove('is-closing');
      }, 220);
    });
  });
});
