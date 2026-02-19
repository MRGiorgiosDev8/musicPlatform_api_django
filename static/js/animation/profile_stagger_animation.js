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
  const passwordBlock = document.getElementById("block-password");
  const animatedBlocks = [avatarBlock, infoBlock, infoTwoBlock, passwordBlock];

  const showWithoutAnimation = () => {
    animatedBlocks.forEach((block) => {
      if (!block) return;
      block.style.opacity = "1";
      block.style.transform = "none";
    });
  };

  if (!avatarBlock || !infoBlock || !infoTwoBlock || !passwordBlock) return;
  if (sessionStorage.getItem(SKIP_PROFILE_ANIMATION_KEY) === "1") {
    sessionStorage.removeItem(SKIP_PROFILE_ANIMATION_KEY);
    showWithoutAnimation();
    return;
  }
  if (typeof gsap === "undefined") {
    showWithoutAnimation();
    return;
  }

  const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power3.out" } });

  tl.fromTo(
    avatarBlock,
    { x: -100, opacity: 0 },
    { x: 0, opacity: 1, delay: 0.3}
  ).fromTo(
    [infoBlock, infoTwoBlock, passwordBlock],
    { scale: 0.8, opacity: 0, transformOrigin: "center center" },
    { scale: 1, opacity: 1, stagger: 0.3 },
    "-=0.45"
  );
});
