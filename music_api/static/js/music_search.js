const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const setupMusicSearch = () => {
    const searchForm = document.querySelector('.form-search');
    const searchInput = document.querySelector('.input-search');

    if (!searchForm || !searchInput) return;

    let resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'searchResults';
        resultsContainer.className = 'search-container';
        document.querySelector('main').prepend(resultsContainer);
    }

    const loadingElement = document.createElement('div');
    loadingElement.className = 'search-loading';
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск музыки...';
    loadingElement.style.display = 'none';
    resultsContainer.appendChild(loadingElement);

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();

        if (!query) return;

        resultsContainer.innerHTML = '';
        loadingElement.style.display = 'block';
        resultsContainer.appendChild(loadingElement);

        const cachedResults = localStorage.getItem(`music_search_${query}`);
        if (cachedResults) {
            const data = JSON.parse(cachedResults);
            displayResults(data);
            loadingElement.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/music_api/search/?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error('Ошибка сервера');
            }

            const data = await response.json();
            localStorage.setItem(`music_search_${query}`, JSON.stringify(data));

            displayResults(data);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка при поиске музыки
                </div>
            `;
        } finally {
            loadingElement.style.display = 'none';
        }
    });

    const displayResults = (data) => {
        if (data.length > 0) {
            let html = data.map(track => `
                <div class="track-item">
                    <h5 class="track-title">${escapeHtml(track.name)}</h5>
                    <p class="track-artist">Исполнитель: ${escapeHtml(track.artist)}</p>
                    <p class="track-listeners">Слушателей: ${track.listeners}</p>
                    <a href="${track.url}" target="_blank" class="btn btn-sm btn-outline-danger">
                        <i class="fas fa-external-link-alt"></i> <span style="color: #dedede;">Подробнее</span>
                    </a>
                </div>
            `).join('');

            resultsContainer.innerHTML = html;
        } else {
            resultsContainer.innerHTML = `
                <div class="alert alert-dark">
                    <i class="fas fa-info-circle"></i> По запросу "${escapeHtml(query)}" ничего не найдено
                </div>
            `;
        }
    };
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);