(function () {
  function initLogoHeader() {
    const logoText = document.querySelector('.logo-text');
    if (!logoText) return;

    const split = new SplitText(logoText, { type: "chars" });
    const chars = split.chars;

    const firstGroup = chars.slice(0, 9);
    const lastGroup = chars.slice(9);

    const mainTl = gsap.timeline({ delay: 0.4 });

    gsap.set(firstGroup, {
      opacity: 0,
      rotationX: -120,
      transformOrigin: "50% 50%",
      z: -50
    });

    mainTl.to(firstGroup, {
      opacity: 1,
      rotationX: 0,
      z: 0,
      duration: 0.6,
      ease: "back.out(2)",
      stagger: 0.07
    });

    gsap.set(lastGroup, {
      opacity: 0,
      y: 30
    });

    mainTl.to(lastGroup, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.1
    }, "-=0.4");

    const header = document.querySelector('#searchResults h2');
    if (header) {
      mainTl.fromTo(header,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.2"
      );
    }
  }

  document.addEventListener('DOMContentLoaded', initLogoHeader);
})();