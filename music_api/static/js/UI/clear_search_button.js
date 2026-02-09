document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-query');
    const clearButton = document.getElementById('clearSearch');

    if (searchInput && clearButton) {
        // Показываем/скрываем крестик в зависимости от наличия текста
        function toggleClearButton() {
            if (searchInput.value.trim()) {
                clearButton.style.display = 'flex';
            } else {
                clearButton.style.display = 'none';
            }
        }

        // Очищаем поле при клике на крестик
        clearButton.addEventListener('click', function(e) {
            e.preventDefault();
            searchInput.value = '';
            searchInput.focus();
            toggleClearButton();
            
            // НЕ обновляем анимацию неоновой рамки, чтобы она продолжала работать
            // НЕ триггерим событие input, чтобы не сбивать анимацию
        });

        // Отслеживаем ввод текста
        searchInput.addEventListener('input', toggleClearButton);
        searchInput.addEventListener('keyup', toggleClearButton);
        searchInput.addEventListener('change', toggleClearButton);

        // Инициализация при загрузке
        toggleClearButton();
    }
});
