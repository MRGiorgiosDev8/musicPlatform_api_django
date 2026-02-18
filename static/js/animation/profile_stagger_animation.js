document.addEventListener("DOMContentLoaded", () => {
  const SKIP_PROFILE_ANIMATION_KEY = "skipProfileAnimationOnce";

  const saveButton = document.querySelector(".btn-ruby-profile");
  const profileForm = saveButton ? saveButton.closest("form") : null;

  if (profileForm) {
    profileForm.addEventListener("submit", () => {
      sessionStorage.setItem(SKIP_PROFILE_ANIMATION_KEY, "1");
    });
  }

  const avatarBlock = document.getElementById("blcok-avatar");
  const infoBlock = document.getElementById("block-info");
  const infoTwoBlock = document.getElementById("block-info-two");

  if (!avatarBlock || !infoBlock || !infoTwoBlock) return;
  if (sessionStorage.getItem(SKIP_PROFILE_ANIMATION_KEY) === "1") {
    sessionStorage.removeItem(SKIP_PROFILE_ANIMATION_KEY);
    return;
  }
  if (typeof gsap === "undefined") return;

  const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power3.out" } });

  tl.fromTo(
    avatarBlock,
    { x: -100, opacity: 0 },
    { x: 0, opacity: 1, delay: 0.3}
  ).fromTo(
    [infoBlock, infoTwoBlock],
    { scale: 0.8, opacity: 0, transformOrigin: "center center" },
    { scale: 1, opacity: 1, stagger: 0.3 },
    "-=0.45"
  );
});
