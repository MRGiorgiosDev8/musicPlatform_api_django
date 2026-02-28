document.addEventListener("DOMContentLoaded", () => {
  const modalElement = document.getElementById("artistBioModal");
  if (!modalElement) return;
  if (typeof gsap === "undefined") return;
  if (typeof bootstrap === "undefined" || typeof bootstrap.Modal !== "function") return;

  const dialog = modalElement.querySelector(".modal-dialog");
  const content = modalElement.querySelector(".modal-content");
  if (!dialog || !content) return;

  const CLOSING_FLAG = "gsapClosing";

  const clearAnimatedStyles = () => {
    gsap.set([dialog, content], {
      clearProps: "transform,opacity,filter,backdropFilter,boxShadow",
    });
  };

  modalElement.addEventListener("hide.bs.modal", (event) => {
    if (modalElement.dataset[CLOSING_FLAG] === "1") {
      delete modalElement.dataset[CLOSING_FLAG];
      return;
    }

    event.preventDefault();

    gsap.killTweensOf([content]);

    const tl = gsap.timeline({
      defaults: { duration: 0.34, ease: "back.in(1.7)" },
      onComplete: () => {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (!modalInstance) return;
        modalElement.dataset[CLOSING_FLAG] = "1";
        modalInstance.hide();
      },
    });

    tl.to(
      [content],
      {
        scale: 0.5,
        filter: "blur(50px)",
        opacity: 0,
        transformOrigin: "center center",
        overwrite: "auto",
      },
      0
    );
  });

  modalElement.addEventListener("hidden.bs.modal", () => {
    clearAnimatedStyles();
  });
});
