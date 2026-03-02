document.addEventListener('DOMContentLoaded', () => {
  const animateAlertLog = (element) => {
    gsap.fromTo(element, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3 });

    setTimeout(() => {
      gsap.to(element, {
        opacity: 0,
        scale: 0,
        duration: 0.3,
        onComplete: () => {
          element.remove();
        },
      });
    }, 1500);
  };

  document.querySelectorAll('.alert-log').forEach(animateAlertLog);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList.contains('alert-log')) {
            animateAlertLog(node);
          }
          node.querySelectorAll && node.querySelectorAll('.alert-log').forEach(animateAlertLog);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
