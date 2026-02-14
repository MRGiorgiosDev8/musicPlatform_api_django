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

  const loadingElement = document.getElementById('searchLoader');

  const showLoader = () => {
    if (window.Spinners && window.Spinners.search) {
      window.Spinners.search.show();
    }
  };
  const hideLoader = () => {
    if (window.Spinners && window.Spinners.search) {
      window.Spinners.search.hide();
    }
  };

  let currentPage = 1;
  let totalPages = 1;
  let allTracks = [];
  const tracksPerPage = 6;
  let renderVersion = 0;

  const createFavoriteControl = async (track) => {
    const container = document.createElement('div');
    container.className = 'd-flex justify-content-end mt-2';

    if (typeof window.createFavoriteButtonWithCheck !== 'function') {
      return container;
    }

    try {
      const favoriteButton = await window.createFavoriteButtonWithCheck(track.name, track.artist);
      favoriteButton.classList.add('shadow-sm');
      container.appendChild(favoriteButton);
    } catch (error) {
      console.error('Favorite button init error:', error);
    }

    return container;
  };

  const createLoadMoreButton = () => {
    const loadMoreContainer = document.createElement('div');
    loadMoreContainer.className = 'load-more-container';
    loadMoreContainer.style.textAlign = 'center';
    loadMoreContainer.style.margin = '20px 0';

    const loadMoreButton = document.createElement('button');
    loadMoreButton.className = 'btn btn-sm btn-show-more mt-3';
    loadMoreButton.style.transform = 'scale(1.1)';
    loadMoreButton.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
    loadMoreButton.style.backgroundColor = 'transparent';
    loadMoreButton.style.border = 'none';
    loadMoreButton.style.outline = 'none';
    loadMoreButton.style.opacity = '0.90';

    loadMoreButton.addEventListener('mouseenter', () => {
      loadMoreButton.style.transform = 'scale(0.95)';
    });
    loadMoreButton.addEventListener('mouseleave', () => {
      loadMoreButton.style.transform = 'scale(1.1)';
    });

    const arrowIcon = document.createElement('img');
    arrowIcon.src = '/static/images/arrow-down.svg';
    arrowIcon.alt = 'Show More';
    arrowIcon.style.width = '50px';
    arrowIcon.style.height = '50px';

    loadMoreButton.appendChild(arrowIcon);
    loadMoreButton.disabled = currentPage >= totalPages;

    loadMoreButton.addEventListener('click', async () => {
      currentPage++;
      await displayResults();
    });

    loadMoreContainer.appendChild(loadMoreButton);
    return loadMoreContainer;
  };

  const displayResults = async () => {
    const currentRenderVersion = ++renderVersion;
    hidePopular();
    if (currentPage === 1) {
      resultsContainer.replaceChildren();
    }

    if (allTracks.length === 0) {
      resultsContainer.insertAdjacentHTML(
        'beforeend',
        `
        <div class="text-center">
          <div class="alert alert-dark mt-5 alert-log d-inline-block">
            <i class="fas fa-info-circle"></i>
            По запросу "${escapeHtml(searchInput.value.trim())}" ничего не найдено
          </div>
        </div>
        `
      );
      return;
    }

    const startIndex = (currentPage - 1) * tracksPerPage;
    const tracksToShow = allTracks.slice(startIndex, startIndex + tracksPerPage);

    for (const track of tracksToShow) {
      const trackItemWrapper = document.createElement('div');
      trackItemWrapper.className = 'track-item-wrapper mb-5';

      const trackItem = document.createElement('div');
      trackItem.className = 'track-item';

      // Изображение
      const img = document.createElement('img');
      img.src = track.image_url;
      img.alt = escapeHtml(track.name);
      img.className = 'track-image shadow-sm img-fluid';
      img.loading = 'lazy';

      // Название трека
      const h5 = document.createElement('h5');
      h5.className = 'track-title text-start';
      h5.textContent = track.name;

      // Артист
      const pArtist = document.createElement('p');
      pArtist.className = 'track-artist';

      const spanArtist = document.createElement('span');
      spanArtist.style.color = 'black';
      spanArtist.style.borderLeft = '3px solid rgba(255, 13, 0, 0.73)';
      spanArtist.style.borderRadius = '3px';
      spanArtist.style.paddingLeft = '4px';
      spanArtist.textContent = `Артист: ${track.artist}`;

      pArtist.appendChild(spanArtist);

      // Прослушивания
      const pListeners = document.createElement('p');
      pListeners.className = 'track-listeners text-black mb-3 small';
      pListeners.textContent = `Прослушиваний: ${track.listeners}`;

      const hasAudio = track.url && /\.(mp3|m4a)(\?.*)?$/i.test(track.url);

      // Кнопка избранного
      const favoriteControl = await createFavoriteControl(track);
      if (currentRenderVersion !== renderVersion) return;

      if (hasAudio) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'none';
        audio.style.width = '100%';
        audio.style.filter = 'sepia(1) saturate(2) hue-rotate(320deg)';

        const source = document.createElement('source');
        source.src = track.url;

        audio.appendChild(source);

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

        trackItem.append(img, h5, pArtist, pListeners, favoriteControl, audio);
      } else {
        const noPreview = document.createElement('div');
        noPreview.className = 'fs-6 text-muted d-inline-block border-bottom border-danger';
        noPreview.textContent = 'Превью недоступно';
        trackItem.append(img, h5, pArtist, pListeners, favoriteControl, noPreview);
      }

      trackItemWrapper.appendChild(trackItem);
      resultsContainer.appendChild(trackItemWrapper);
    }

    const oldButton = resultsContainer.querySelector('.load-more-container');
    if (oldButton) oldButton.remove();
    if (currentPage < totalPages) resultsContainer.appendChild(createLoadMoreButton());
  };

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    resultsContainer.replaceChildren();
    showLoader();

    const cacheKey = `music_search_${query}`;
    const cached = getCachedTrend(cacheKey);
    if (cached) {
      allTracks = cached;
      currentPage = 1;
      totalPages = Math.ceil(allTracks.length / tracksPerPage);
      hideLoader();
      await displayResults();
      return;
    }

    try {
      const response = await fetch(`/music_api/search/?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      allTracks = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      setCachedTrend(cacheKey, allTracks);
      currentPage = 1;
      totalPages = Math.ceil(allTracks.length / tracksPerPage);
      displayResults();
    } catch (error) {
      console.error('Search Error:', error);
      resultsContainer.insertAdjacentHTML(
        'beforeend',
        `
        <div class="text-center">
          <div class="alert alert-danger alert-log mt-4 d-inline-block">
            <i class="fas fa-exclamation-triangle"></i>
            Произошла ошибка при поиске музыки
          </div>
        </div>
        `
      );
    } finally {
      hideLoader();
    }
  });

  searchInput.addEventListener('input', () => {
    if (!searchInput.value.trim()) showPopular();
  });
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);