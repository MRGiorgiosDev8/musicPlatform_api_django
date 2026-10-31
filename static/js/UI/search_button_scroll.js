"use strict";
(() => {
  // static/js/UI/search_button_scroll.ts
  (function() {
    const buttonSelector = ".custom-button";
    function forceScrollToTop() {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    }
    document.addEventListener("click", (e) => {
      const target = e.target;
      const btn = target?.closest(buttonSelector);
      if (!btn) return;
      setTimeout(forceScrollToTop, 0);
    });
  })();
})();
