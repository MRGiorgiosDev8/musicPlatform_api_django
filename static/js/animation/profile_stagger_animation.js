document.addEventListener("DOMContentLoaded", () => {
  const SKIP_PROFILE_ANIMATION_KEY = "skipProfileAnimationOnce";

  const saveButton = document.querySelector(".btn-ruby-profile");
  const profileForm = saveButton ? saveButton.closest("form") : null;

  if (profileForm) {
    profileForm.addEventListener("submit", () => {
      sessionStorage.setItem(SKIP_PROFILE_ANIMATION_KEY, "1");
    });
  }

  const avatarInput = document.getElementById("avatar");
  if (avatarInput) {
    avatarInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      const avatarWrap = document.querySelector(".profile-avatar-wrap");
      if (!avatarWrap) return;

      let avatarImg = avatarWrap.querySelector(".profile-avatar");
      if (!avatarImg) {
        avatarImg = document.createElement("img");
        avatarImg.className = "profile-avatar";
        avatarImg.alt = "Avatar";
        avatarWrap.replaceChildren(avatarImg);
      }

      avatarImg.classList.remove("profile-avatar-fallback");
      avatarImg.src = URL.createObjectURL(file);
    });
  }

  const avatarBlock = document.getElementById("blcok-avatar");
  const infoBlock = document.getElementById("block-info");
  const infoTwoBlock = document.getElementById("block-info-two");
  const passwordBlock = document.getElementById("block-password");
  const likeNotificationsBlock = document.getElementById("block-like-notifications");
  const animatedBlocks = [avatarBlock, infoBlock, infoTwoBlock, passwordBlock, likeNotificationsBlock];

  const showWithoutAnimation = () => {
    animatedBlocks.forEach((block) => {
      if (!block) return;
      block.style.opacity = "1";
      block.style.transform = "none";
    });
  };

  const requiredBlocks = [avatarBlock, infoBlock, infoTwoBlock, passwordBlock];
  if (requiredBlocks.some((block) => !block)) return;
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
    { y: 100, opacity: 0 },
    { y: 0, opacity: 1, delay: 0.3}
  ).fromTo(
    [infoBlock, infoTwoBlock, passwordBlock, likeNotificationsBlock].filter(Boolean),
    { scale: 0.8, opacity: 0, transformOrigin: "center center" },
    { scale: 1, opacity: 1, stagger: 0.3 },
    "-=0.45"
  );
});
