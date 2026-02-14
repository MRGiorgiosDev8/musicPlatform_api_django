document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-query');
    const clearButton = document.getElementById('clearSearch');

    if (searchInput && clearButton) {
        let isProcessing = false;
        
        function toggleClearButton() {
            const hasValue = searchInput.value.trim().length > 0;
            const displayStyle = hasValue ? 'flex' : 'none';
            
            requestAnimationFrame(() => {
                clearButton.style.display = displayStyle;
            });
        }

        function clearSearch() {
            if (isProcessing) return;
            isProcessing = true;
            
            searchInput.value = '';
            
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
            
            searchInput.dispatchEvent(inputEvent);
            searchInput.dispatchEvent(changeEvent);
            
            searchInput.focus();
            toggleClearButton();
            
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        }

        clearButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearSearch();
        });
        
        clearButton.addEventListener('mousedown', function(e) {
            e.preventDefault();
            clearSearch();
        });

        searchInput.addEventListener('input', toggleClearButton);
        searchInput.addEventListener('keyup', toggleClearButton);
        searchInput.addEventListener('change', toggleClearButton);

        toggleClearButton();
    }
});
