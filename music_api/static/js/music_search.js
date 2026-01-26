const TREND_CACHE_TTL = 10 * 60 * 1000;   

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getCachedTrend = key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts > TREND_CACHE_TTL ? null : data;
  } catch { return null; }
};
const setCachedTrend = (key, data) => {
  localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
};

const hidePopular = () => {
  const popular = document.getElementById('popular-block');
  if (popular) popular.style.display = 'none';
};

const showPopular = () => {
  const popular = document.getElementById('popular-block');
  if (popular) popular.style.display = '';
};

let activeAudio = null;

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
  loadingElement.innerHTML = '<i class="fas fa-spinner mt-3 fa-spin"></i> <span style="font-weight: 300;">поиск музыки ...</span>';
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
    loadMoreButton.className = 'btn btn-sm btn-outline-danger btn-show-more shadow-sm mt-3';
    loadMoreButton.style.transform = 'scale(1.1)';
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
    hidePopular();
    if (currentPage === 1) resultsContainer.innerHTML = '';

    if (allTracks.length === 0) {
      resultsContainer.innerHTML = `
        <div class="alert alert-dark">
          <i class="fas fa-info-circle"></i> On request "${escapeHtml(searchInput.value.trim())}" nothing found
        </div>`;
      return;
    }

    const startIndex = (currentPage - 1) * tracksPerPage;
    const tracksToShow = allTracks.slice(startIndex, startIndex + tracksPerPage);
    let html = tracksToShow.map(track => {
      const hasAudio = track.url && /\.(mp3|m4a)(\?.*)?$/i.test(track.url);
      const audioBlock = hasAudio
        ? `<audio controls preload="none" style="width:100%; filter:sepia(1) saturate(2) hue-rotate(320deg);">
         <source src="${track.url}">
         Your browser does not support audio.
       </audio>`
        : `<div class="fs-6 text-muted d-inline-block border-bottom border-danger">Превью недоступно</div>`;

      return `
    <div class="track-item-wrapper">
      <div class="track-item shadow-sm">
          <img src="${track.image_url}" alt="${escapeHtml(track.name)}" class="track-image shadow-sm img-fluid" loading="lazy">
        <h5 class="track-title text-start">${escapeHtml(track.name)}</h5>
        <p class="track-artist">
          <span style="color: black; border-left: 3px solid rgba(255, 13, 0, 0.73); border-radius: 3px; padding-left: 4px;">
            Артист: ${escapeHtml(track.artist)}
          </span>
        </p>
        <p class="track-listeners text-black mb-3 small">Прослушиваний: ${track.listeners}</p>
        ${audioBlock}
      </div>
    </div>`;
    }).join('');

    resultsContainer.insertAdjacentHTML('beforeend', html);

    resultsContainer.querySelectorAll('audio').forEach(audio => {
      audio.addEventListener('play', () => {
        if (activeAudio && activeAudio !== audio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
        }
        activeAudio = audio;
      });
      audio.addEventListener('ended', () => {
        if (activeAudio === audio) activeAudio = null;
      });
    });

    const oldButton = resultsContainer.querySelector('.load-more-container');
    if (oldButton) oldButton.remove();
    if (currentPage < totalPages) resultsContainer.appendChild(createLoadMoreButton());
  };

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    resultsContainer.innerHTML = '';
    loadingElement.style.display = 'block';
    resultsContainer.appendChild(loadingElement);

    const cacheKey = `music_search_${query}`;
    const cached = getCachedTrend(cacheKey);          
    if (cached) {
      allTracks = cached;
      currentPage = 1;
      totalPages = Math.ceil(allTracks.length / tracksPerPage);
      loadingElement.style.display = 'none';
      displayResults();
      return;
    }

    try {
      const response = await fetch(`/music_api/search/?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      allTracks = data.results || data;
      setCachedTrend(cacheKey, allTracks);            
      currentPage = 1;
      totalPages = Math.ceil(allTracks.length / tracksPerPage);
      displayResults();
    } catch (error) {
      console.error('Search Error:', error);
      resultsContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i> There was an error when searching for music
        </div>`;
    } finally {
      loadingElement.style.display = 'none';
    }
  });

  searchInput.addEventListener('input', () => {
    if (!searchInput.value.trim()) showPopular();
  });
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);