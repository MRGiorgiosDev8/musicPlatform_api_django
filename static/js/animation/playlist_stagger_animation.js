document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("playlists-root");
  if (!root) return;
  const filterPanel = document.getElementById("playlist-filter-panel");
  const mobileFilterTrigger = document.querySelector(".playlist-filter-mobile-trigger");

  const showWithoutAnimation = () => {
    if (filterPanel) {
      filterPanel.style.opacity = "1";
      filterPanel.style.transform = "none";
    }
    if (mobileFilterTrigger) {
      mobileFilterTrigger.style.opacity = "1";
      mobileFilterTrigger.style.transform = "none";
    }
    root.querySelectorAll(".track-item-playlist").forEach((item) => {
      item.style.opacity = "1";
      item.style.transform = "none";
    });
  };

  if (typeof gsap === "undefined") {
    showWithoutAnimation();
    return;
  }

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

  const animateFilterPanel = () => {
    if (!filterPanel) return;
    if (getComputedStyle(filterPanel).display === "none") {
      filterPanel.style.opacity = "1";
      filterPanel.style.transform = "none";
      return;
    }

    gsap.fromTo(
      filterPanel,
      { autoAlpha: 0, x: -18 },
      { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" }
    );
  };

  const animateMobileFilterTrigger = () => {
    if (!mobileFilterTrigger) return;
    if (getComputedStyle(mobileFilterTrigger).display === "none") {
      mobileFilterTrigger.style.opacity = "1";
      mobileFilterTrigger.style.transform = "none";
      return;
    }

    gsap.fromTo(
      mobileFilterTrigger,
      { autoAlpha: 0, scale: 0, transformOrigin: "center center" },
      { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" }
    );
  };

  requestAnimationFrame(() => {
    animateMobileFilterTrigger();
    animateFilterPanel();
    animateVisibleItems();
  });

  root.addEventListener("click", (event) => {
    const loadMoreButton = event.target.closest(".btn-show-more");
    if (!loadMoreButton) return;
    requestAnimationFrame(animateVisibleItems);
  });
});
