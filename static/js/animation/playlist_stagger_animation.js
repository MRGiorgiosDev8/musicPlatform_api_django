document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;

  const root = document.getElementById("playlists-root");
  if (!root) return;

  const getVisibleUnanimatedItems = () =>
    Array.from(root.querySelectorAll(".track-item-playlist"))
      .filter((item) => item.style.display !== "none" && !item.dataset.staggerAnimated);

  const animateVisibleItems = () => {
    const items = getVisibleUnanimatedItems();
    if (!items.length) return;

    items.forEach((item) => {
      item.dataset.staggerAnimated = "1";
    });

    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.12
      }
    );
  };

  requestAnimationFrame(animateVisibleItems);

  root.addEventListener("click", (event) => {
    const loadMoreButton = event.target.closest(".btn-show-more");
    if (!loadMoreButton) return;
    requestAnimationFrame(animateVisibleItems);
  });
});
