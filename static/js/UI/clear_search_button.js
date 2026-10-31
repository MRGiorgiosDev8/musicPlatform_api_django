"use strict";
(() => {
  // static/js/UI/clear_search_button.ts
  document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("search-query");
    const clearButton = document.getElementById("clearSearch");
    if (searchInput && clearButton) {
      let toggleClearButton2 = function() {
        const hasValue = input.value.trim().length > 0;
        const displayStyle = hasValue ? "flex" : "none";
        requestAnimationFrame(() => {
          button.style.display = displayStyle;
        });
      }, clearSearch2 = function() {
        if (isProcessing) return;
        isProcessing = true;
        input.value = "";
        const inputEvent = new Event("input", { bubbles: true, cancelable: true });
        const changeEvent = new Event("change", { bubbles: true, cancelable: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
        input.focus();
        toggleClearButton2();
        setTimeout(() => {
          isProcessing = false;
        }, 100);
      };
      var toggleClearButton = toggleClearButton2, clearSearch = clearSearch2;
      const input = searchInput;
      const button = clearButton;
      let isProcessing = false;
      button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearSearch2();
      });
      button.addEventListener("mousedown", function(e) {
        e.preventDefault();
        clearSearch2();
      });
      input.addEventListener("input", toggleClearButton2);
      input.addEventListener("keyup", toggleClearButton2);
      input.addEventListener("change", toggleClearButton2);
      toggleClearButton2();
    }
  });
})();
