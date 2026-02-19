document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;

  const root = document.getElementById("playlists-root");
  if (!root) return;

  const items = root.querySelectorAll(".track-item-playlist");
  if (!items.length) return;

  gsap.fromTo(
    items,
    { autoAlpha: 0, y: 24 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
      ease: "power3.out",
      stagger: 0.12
    }
  );
});
