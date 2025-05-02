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
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin "></i> Search for music...';
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
                    <i class="fas fa-exclamation-triangle"></i> Error when searching for music
                </div>
            `;
        } finally {
            loadingElement.style.display = 'none';
        }
    });

    const displayResults = (data) => {
        if (data.length > 0) {
            
            const resultsHeader = document.createElement('h2');
            resultsHeader.textContent = 'Results';
            
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(resultsHeader);

            let html = data.map(track => `
                <div class="track-item-wrapper">
                    <img class="arrow-track" src="/static/images/arrowruby.svg" class="track-arrow" alt="Arrow">
                    <div class="track-item">
                        <img src="${track.image_url}" alt="${escapeHtml(track.name)}" class="track-image">
                        <h5 class="track-title">${escapeHtml(track.name)}</h5>
                        <p class="track-artist">
                            <span style="color: whitesmoke; border-left: 3px solid rgba(255, 13, 0, 0.73); border-radius: 3px; padding-left: 4px;">
                                Исполнитель: ${escapeHtml(track.artist)}
                            </span>
                        </p>
                        <p class="track-listeners">Слушателей: ${track.listeners}</p>
                        <a href="${track.url}" target="_blank" class="btn btn-sm btn-outline-danger">
                            <i class="fas fa-external-link-alt"></i> <span style="color: #dedede;">Подробнее</span>
                        </a>
                    </div>
                </div>
            `).join('');

            resultsContainer.insertAdjacentHTML('beforeend', html);
            
        } else {
            resultsContainer.innerHTML += `
                <div class="alert alert-dark">
                    <i class="fas fa-info-circle"></i> По запросу "${escapeHtml(searchInput.value.trim())}" ничего не найдено
                </div>
            `;
            
           const noResult = '<h2>Results</h2>';
           resultsContainer.insertAdjacentHTML('afterbegin', noResult);
       }
   };
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);