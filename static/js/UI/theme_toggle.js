"use strict";
(() => {
  // static/js/UI/theme_toggle.ts
  (() => {
    const root = document.documentElement;
    const toggleButton = document.getElementById("themeToggle");
    const footer = document.querySelector("footer");
    const storageKey = "site-theme";
    const allowedThemes = /* @__PURE__ */ new Set(["default", "dark"]);
    const showAfterScrollY = 120;
    const hideAfterIdleMs = 3e3;
    let idleHideTimerId = null;
    const getTheme = () => {
      const currentTheme = root.getAttribute("data-theme");
      return currentTheme && allowedThemes.has(currentTheme) ? currentTheme : "default";
    };
    const syncToggleVisibility = () => {
      if (!toggleButton) {
        return;
      }
      const passedHeaderZone = window.scrollY > showAfterScrollY;
      let overlapsFooter = false;
      if (footer) {
        const footerTopInViewport = footer.getBoundingClientRect().top;
        overlapsFooter = footerTopInViewport <= window.innerHeight - 24;
      }
      const shouldShow = passedHeaderZone && !overlapsFooter;
      toggleButton.classList.toggle("is-visible", shouldShow);
    };
    const resetIdleHideTimer = () => {
      if (!toggleButton) return;
      if (idleHideTimerId) {
        window.clearTimeout(idleHideTimerId);
      }
      idleHideTimerId = window.setTimeout(() => {
        toggleButton.classList.remove("is-visible");
      }, hideAfterIdleMs);
    };
    const applyTheme = (theme) => {
      const nextTheme = allowedThemes.has(theme) ? theme : "default";
      root.setAttribute("data-theme", nextTheme);
      localStorage.setItem(storageKey, nextTheme);
      if (!toggleButton) {
        return;
      }
      const isDark = nextTheme === "dark";
      toggleButton.classList.toggle("is-dark", isDark);
      toggleButton.setAttribute(
        "aria-label",
        isDark ? "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u0430 \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0442\u0435\u043C\u0443" : "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u0430 \u0442\u0451\u043C\u043D\u0443\u044E \u0442\u0435\u043C\u0443"
      );
      toggleButton.setAttribute("title", isDark ? "\u0422\u0451\u043C\u043D\u0430\u044F \u0442\u0435\u043C\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430" : "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0442\u0435\u043C\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430");
    };
    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        const nextTheme = getTheme() === "dark" ? "default" : "dark";
        applyTheme(nextTheme);
      });
      let ticking = false;
      window.addEventListener(
        "scroll",
        () => {
          if (ticking) {
            return;
          }
          ticking = true;
          window.requestAnimationFrame(() => {
            syncToggleVisibility();
            resetIdleHideTimer();
            ticking = false;
          });
        },
        { passive: true }
      );
      window.addEventListener(
        "resize",
        () => {
          syncToggleVisibility();
          resetIdleHideTimer();
        },
        { passive: true }
      );
    }
    applyTheme(getTheme());
    syncToggleVisibility();
    resetIdleHideTimer();
  })();
})();
