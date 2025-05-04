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
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> music search...';
    loadingElement.style.display = 'none';
    resultsContainer.appendChild(loadingElement);

    let currentPage = 1;
    let totalPages = 1;
    let allTracks = [];
    const tracksPerPage = 6;

    const createLoadMoreButton = () => {
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'load-more-container';
        loadMoreContainer.style.textAlign = 'center';
        loadMoreContainer.style.margin = '20px 0';

        const loadMoreButton = document.createElement('button');
        loadMoreButton.className = 'btn btn-sm btn-outline-danger btn-show-more';
        loadMoreButton.innerHTML = 'Show More <i class="fas fa-chevron-down"></i>';
        loadMoreButton.disabled = currentPage >= totalPages;
        loadMoreButton.addEventListener('click', () => {
            currentPage++;
            displayResults();
        });

        loadMoreContainer.appendChild(loadMoreButton);
        return loadMoreContainer;
    };

    const displayResults = () => {
        if (currentPage === 1) {
            resultsContainer.innerHTML = '';
        }

        if (allTracks.length === 0) {
            resultsContainer.innerHTML = `
                <div class="alert alert-dark">
                    <i class="fas fa-info-circle"></i> On request "${escapeHtml(searchInput.value.trim())}" nothing found
                </div>
            `;
            return;
        }

        if (currentPage === 1) {
            const resultsHeader = document.createElement('h2');
            resultsHeader.textContent = 'Results';
            resultsContainer.appendChild(resultsHeader);
        }

        const startIndex = (currentPage - 1) * tracksPerPage;
        const tracksToShow = allTracks.slice(startIndex, startIndex + tracksPerPage);

        let html = tracksToShow.map(track => `
            <div class="track-item-wrapper">
                <img class="arrow-track" src="/static/images/arrowruby.svg" class="track-arrow" alt="Arrow">
                <div class="track-item">
                    <img src="${track.image_url}" alt="${escapeHtml(track.name)}" class="track-image">
                    <h5 class="track-title">${escapeHtml(track.name)}</h5>
                    <p class="track-artist">
                        <span style="color: whitesmoke; border-left: 3px solid rgba(255, 13, 0, 0.73); border-radius: 3px; padding-left: 4px;">
                           Artist: ${escapeHtml(track.artist)}
                        </span>
                    </p>
                    <p class="track-listeners">Listeners: ${track.listeners}</p>
                    <a href="${track.url}" target="_blank" class="btn btn-sm btn-outline-danger">
                        <i class="fas fa-external-link-alt"></i> <span style="color: #dedede;">Read More</span>
                    </a>
                </div>
            </div>
        `).join('');

        resultsContainer.insertAdjacentHTML('beforeend', html);

        const oldButton = resultsContainer.querySelector('.load-more-container');
        if (oldButton) oldButton.remove();

        if (currentPage < totalPages) {
            resultsContainer.appendChild(createLoadMoreButton());
        }
    };

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();

        if (!query) return;

        resultsContainer.innerHTML = '';
        loadingElement.style.display = 'block';
        resultsContainer.appendChild(loadingElement);

        const cachedResults = localStorage.getItem(`music_search_${query}`);
        if (cachedResults) {
            allTracks = JSON.parse(cachedResults);
            currentPage = 1;
            totalPages = Math.ceil(allTracks.length / tracksPerPage);
            loadingElement.style.display = 'none';
            displayResults();
            return;
        }

        try {
            const response = await fetch(`/music_api/search/?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();
            allTracks = data.results || data;
            localStorage.setItem(`music_search_${query}`, JSON.stringify(allTracks));

            currentPage = 1;
            totalPages = Math.ceil(allTracks.length / tracksPerPage);

            displayResults();
        } catch (error) {
            console.error('Search Error:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> There was an error when searching for music
                </div>
            `;
        } finally {
            loadingElement.style.display = 'none';
        }
    });
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);