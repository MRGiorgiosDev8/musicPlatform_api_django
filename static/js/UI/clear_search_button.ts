document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('search-query') as HTMLInputElement | null;
  const clearButton = document.getElementById('clearSearch');

  if (searchInput && clearButton) {
    // Локальные не-nullable алиасы: TS сужает const-захваты в замыканиях неточно,
    // поэтому внутренние функции работают с гарантированно существующими узлами.
    const input: HTMLInputElement = searchInput;
    const button: HTMLElement = clearButton;
    let isProcessing = false;

    function toggleClearButton() {
      const hasValue = input.value.trim().length > 0;
      const displayStyle = hasValue ? 'flex' : 'none';

      requestAnimationFrame(() => {
        button.style.display = displayStyle;
      });
    }

    function clearSearch() {
      if (isProcessing) return;
      isProcessing = true;

      input.value = '';

      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });

      input.dispatchEvent(inputEvent);
      input.dispatchEvent(changeEvent);

      input.focus();
      toggleClearButton();

      setTimeout(() => {
        isProcessing = false;
      }, 100);
    }

    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearSearch();
    });

    button.addEventListener('mousedown', function (e) {
      e.preventDefault();
      clearSearch();
    });

    input.addEventListener('input', toggleClearButton);
    input.addEventListener('keyup', toggleClearButton);
    input.addEventListener('change', toggleClearButton);

    toggleClearButton();
  }
});
