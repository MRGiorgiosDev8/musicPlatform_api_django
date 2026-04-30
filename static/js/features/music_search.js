const TREND_CACHE_TTL = 10 * 60 * 1000;

const escapeHtml = (unsafe) => {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getCachedTrend = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts > TREND_CACHE_TTL ? null : data;
  } catch {
    return null;
  }
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

const parseListeners = (value) => {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
};

const getTrackPopularity = (track) => {
  const listeners = parseListeners(track?.listeners);
  if (listeners > 0) return listeners;
  return parseListeners(track?.playcount);
};

const normalizeArtist = (track) => {
  const artist = String(track?.artist ?? '').trim();
  return artist || 'Unknown artist';
};

const prepareTracks = (tracks, state) => {
  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const safeState = state || {};
  const artistFilter = safeState.artistFilter || 'all';
  const listenersSort = safeState.listenersSort || 'default';

  const filtered = safeTracks.filter((track) => {
    if (artistFilter === 'all') return true;
    return normalizeArtist(track).toLowerCase() === artistFilter;
  });

  if (listenersSort === 'default') return filtered;

  return [...filtered].sort((a, b) => {
    const aListeners = getTrackPopularity(a);
    const bListeners = getTrackPopularity(b);
    return listenersSort === 'asc' ? aListeners - bListeners : bListeners - aListeners;
  });
};


const setupMusicSearch = () => {
  const searchForm = document.querySelector('.form-search');
  const searchInput = document.querySelector('.input-search');
  if (!searchForm || !searchInput) return;

  const isSearchPage = document.body?.dataset?.isSearchPage === 'true';
  if (!isSearchPage) return;

  const isAuthenticated = document.body?.dataset?.isAuthenticated === 'true';
  const navbarCollapse = document.getElementById('navbarNav');
  const navbarToggler = document.querySelector('.hamburger.hamburger--elastic');
  const resultsContainer = document.getElementById('searchResults');
  const searchLoader = document.getElementById('searchLoader');
  const searchBreadcrumb = document.getElementById('search-breadcrumb');
  const searchFilterPanel = document.getElementById('search-filter-panel');
  const searchFilterTrigger = document.querySelector('.playlist-filter-mobile-trigger');
  if (!resultsContainer) return;

  if (searchLoader && searchBreadcrumb) {
    searchBreadcrumb.insertAdjacentElement('afterend', searchLoader);
  }

  const listenersSortControls = Array.from(
    document.querySelectorAll('[data-search-listeners-sort]')
  );
  const groupByControls = Array.from(document.querySelectorAll('[data-search-group-by]'));
  const artistFilterControls = Array.from(document.querySelectorAll('[data-search-artist-filter]'));
  const resetFilterButtons = Array.from(document.querySelectorAll('[data-search-reset-filters]'));
  const resetSearchButtons = Array.from(document.querySelectorAll('[data-search-reset-query]'));

  const showLoader = () => window.Spinners?.search?.show?.();
  const hideLoader = () => window.Spinners?.search?.hide?.();

  const tracksPerPage = 6;
  let currentPage = 1;
  let totalPages = 1;
  let allTracks = [];
  let renderVersion = 0;
  let resultsList = null;
  let currentQuery = '';
  let marqueeResizeRafId = null;
  let marqueeResizeBound = false;

  const prepareSearchFilters = () => {
    [searchFilterPanel, searchFilterTrigger].forEach((el) => {
      if (!el) return;
      el.classList.remove('pre-animation');
      el.classList.add('is-search-hidden');
    });
  };

  const showSearchFilters = () => {
    [searchFilterPanel, searchFilterTrigger].forEach((el) => {
      if (!el) return;
      el.classList.remove('is-search-hidden');
      el.classList.remove('pre-animation');
      void el.offsetWidth;
      el.classList.add('pre-animation');
    });
  };

  const hideSearchFilters = () => {
    [searchFilterPanel, searchFilterTrigger].forEach((el) => {
      if (!el) return;
      el.classList.add('is-search-hidden');
    });
  };

  const state = {
    listenersSort: 'desc',
    groupBy: 'none',
    artistFilter: 'all',
  };

  const syncControlValues = () => {
    listenersSortControls.forEach((control) => {
      control.value = state.listenersSort;
    });
    groupByControls.forEach((control) => {
      control.value = state.groupBy;
    });
    artistFilterControls.forEach((control) => {
      control.value = state.artistFilter;
    });
  };

  const populateArtistFilterOptions = () => {
    const artists = Array.from(new Set(allTracks.map((track) => normalizeArtist(track)))).sort(
      (a, b) => a.localeCompare(b, 'ru')
    );

    artistFilterControls.forEach((control) => {
      control.replaceChildren();
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'Все артисты';
      control.appendChild(allOption);

      artists.forEach((artist) => {
        const option = document.createElement('option');
        option.value = artist.toLowerCase();
        option.textContent = artist;
        control.appendChild(option);
      });
    });

    const hasSelectedArtist = artists.some((artist) => artist.toLowerCase() === state.artistFilter);
    if (state.artistFilter !== 'all' && !hasSelectedArtist) {
      state.artistFilter = 'all';
    }
    syncControlValues();
  };

  const getPreparedTracks = () => {
    return prepareTracks(allTracks, state);
  };

  const ensureResultsList = () => {
    if (resultsList && resultsContainer.contains(resultsList)) return resultsList;
    resultsList = document.createElement('ul');
    resultsList.className = 'track-list list-unstyled p-0 m-0 mt-4';
    resultsContainer.appendChild(resultsList);
    return resultsList;
  };

  const createArtistBioButton = (artistName, extraClassName = '') => {
    const safeArtistName = normalizeArtist({ artist: artistName });
    const artistButton = document.createElement('button');
    artistButton.type = 'button';
    artistButton.className = `artist-bio-trigger js-artist-bio-trigger color-dark ${extraClassName}`.trim();
    artistButton.dataset.artistName = safeArtistName;

    const artistTrack = document.createElement('span');
    artistTrack.className = 'artist-bio-trigger-track';

    const artistText = document.createElement('span');
    artistText.className = 'artist-bio-trigger-text';
    artistText.textContent = safeArtistName;

    const artistTextClone = document.createElement('span');
    artistTextClone.className = 'artist-bio-trigger-text artist-bio-trigger-text-clone';
    artistTextClone.textContent = safeArtistName;
    artistTextClone.setAttribute('aria-hidden', 'true');

    artistTrack.append(artistText, artistTextClone);
    artistButton.appendChild(artistTrack);
    return artistButton;
  };

  const syncArtistBioMarquee = () => {
    if (typeof Utils === 'undefined' || typeof Utils.syncInfiniteMarquee !== 'function') return;
    Utils.syncInfiniteMarquee({
      container: resultsContainer,
      targetSelector: '.js-artist-bio-trigger',
      trackSelector: '.artist-bio-trigger-track',
      textSelector: '.artist-bio-trigger-text',
      distanceVar: '--artist-bio-marquee-distance',
      durationVar: '--artist-bio-marquee-duration',
      gapVar: '--artist-bio-marquee-gap',
      gap: 16,
      overflowThreshold: 8,
      minDuration: 4,
      maxDuration: 12,
      speed: 40,
    });
  };

  const scheduleArtistBioMarqueeSync = () => {
    if (marqueeResizeRafId) {
      window.cancelAnimationFrame(marqueeResizeRafId);
    }
    marqueeResizeRafId = window.requestAnimationFrame(() => {
      marqueeResizeRafId = null;
      syncArtistBioMarquee();
    });
  };

  const resetSearchState = () => {
    allTracks = [];
    currentPage = 1;
    totalPages = 1;
    resultsList = null;
    currentQuery = '';
    resultsContainer.replaceChildren();
  };

  const clearSearch = () => {
    const searchPageUrl = searchForm.getAttribute('action') || '/';
    window.location.assign(searchPageUrl);
  };

  const buildResultsSummary = (filteredCount) => {
    const summary = document.createElement('div');
    summary.className =
      'search-results-summary d-flex flex-wrap align-items-center justify-content-between gap-2';

    const meta = document.createElement('div');
    meta.className = 'search-results-summary-meta small text-dark';
    const queryLabel = currentQuery ? `"${escapeHtml(currentQuery)}"` : '—';

    const searchIcon = document.createElement('i');
    searchIcon.className = 'bi bi-search text-danger me-2';
    searchIcon.style.fontSize = '0.875rem';

    const labelText = document.createElement('span');
    labelText.textContent = 'Запрос: ';
    labelText.className = 'text-dark';

    const queryText = document.createElement('strong');
    queryText.textContent = queryLabel;
    queryText.className = 'text-danger';

    meta.appendChild(searchIcon);
    meta.appendChild(labelText);
    meta.appendChild(queryText);

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'btn btn-sm btn-danger';
    clearButton.textContent = 'Очистить поиск';
    clearButton.addEventListener('click', clearSearch);

    summary.append(meta, clearButton);
    return summary;
  };

  const createFavoriteControl = async (track, hasAudioPreviewAvailable = true) => {
    const container = document.createElement('div');
    container.className = 'd-flex align-items-center';
    if (!hasAudioPreviewAvailable) return container;
    if (!isAuthenticated || typeof window.createFavoriteButtonWithCheck !== 'function') {
      return container;
    }

    try {
      const favoriteButton = await window.createFavoriteButtonWithCheck(
        track.name,
        track.artist,
        track.mbid || null
      );
      const syncFavoriteVisualState = () => {
        const isActive = favoriteButton.getAttribute('aria-pressed') === 'true';
        const icon = favoriteButton.querySelector('i');
        if (icon) {
          icon.className = 'bi bi-heart-fill';
          icon.style.fontSize = isActive ? '1.1rem' : '1.4rem';
          icon.style.lineHeight = '34px';
          icon.style.display = 'inline-block';
          icon.style.verticalAlign = 'middle';
          icon.style.margin = '0';
        }

        if (isActive) {
          favoriteButton.style.background = '#dc3545';
          favoriteButton.style.color = '#ffffff';
        } else {
          favoriteButton.style.background = 'transparent';
          favoriteButton.style.color = 'rgba(220, 53, 69, 0.72)';
        }

        favoriteButton.style.border = 'none';
        favoriteButton.style.borderRadius = '50%';
        favoriteButton.style.width = '33px';
        favoriteButton.style.height = '33px';
        favoriteButton.style.padding = '0';
        favoriteButton.style.textAlign = 'center';
        favoriteButton.style.paddingTop = '3px';
      };

      const applyIconOnlyStyle = () => {
        favoriteButton.className = 'favorite-icon-btn';
        favoriteButton.style.boxShadow = 'none';
        favoriteButton.style.minWidth = '34px';
        favoriteButton.style.lineHeight = '1';
        favoriteButton.style.display = 'inline-flex';
        favoriteButton.style.alignItems = 'center';
        favoriteButton.style.justifyContent = 'center';
        favoriteButton.style.boxSizing = 'border-box';
        favoriteButton.style.flexShrink = '0';
        favoriteButton.style.aspectRatio = '1 / 1';
        favoriteButton.style.cursor = 'pointer';
        favoriteButton.style.outline = 'none';
        favoriteButton.style.transition = 'background-color 0.2s ease, color 0.2s ease';
        syncFavoriteVisualState();
      };

      applyIconOnlyStyle();
      const styleSyncObserver = new MutationObserver(() => applyIconOnlyStyle());
      styleSyncObserver.observe(favoriteButton, {
        attributes: true,
        attributeFilter: ['aria-pressed'],
        childList: true,
        subtree: true,
      });

      favoriteButton.addEventListener('mouseenter', () => {
        const isActive = favoriteButton.getAttribute('aria-pressed') === 'true';
        if (!isActive) favoriteButton.style.color = 'rgba(220, 53, 69, 0.95)';
      });
      favoriteButton.addEventListener('mouseleave', () => {
        const isActive = favoriteButton.getAttribute('aria-pressed') === 'true';
        if (!isActive) favoriteButton.style.color = 'rgba(220, 53, 69, 0.72)';
      });

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

    const loadMoreButton = Utils.createShowMoreButton();
    loadMoreButton.addEventListener('click', async () => {
      currentPage += 1;
      await displayResults();
    });

    const arrowIcon = Utils.createChevronDownIcon();

    loadMoreButton.appendChild(arrowIcon);
    loadMoreButton.disabled = currentPage >= totalPages;
    loadMoreContainer.appendChild(loadMoreButton);
    return loadMoreContainer;
  };

  const renderTrackCard = async (track, currentRenderVersion) => {
    const trackItemWrapper = document.createElement('li');
    trackItemWrapper.className = 'track-item-playlist';

    const trackItem = document.createElement('div');
    trackItem.className = 'track-playlist mb-3';

    const img = document.createElement('img');
    img.src = track.image_url;
    img.alt = escapeHtml(track.name);
    img.className = 'track-image search-track-image shadow-sm img-fluid';
    img.loading = 'lazy';

    const trackMeta = document.createElement('div');
    trackMeta.className = 'track-meta';

    const h5 = document.createElement('h5');
    h5.className = 'track-title text-start';
    h5.textContent = track.name;

    const pArtist = document.createElement('p');
    pArtist.className = 'track-artist';

    const artistLabel = document.createElement('span');
    artistLabel.className = 'track-artist-label';
    artistLabel.textContent = 'Артист:';

    const artistButton = createArtistBioButton(normalizeArtist(track));
    pArtist.append(artistLabel, document.createTextNode(' '), artistButton);

    const pListeners = document.createElement('p');
    pListeners.className = 'track-listeners mb-0 small text-muted';
    pListeners.textContent = `Прослушиваний: ${getTrackPopularity(track)}`;

    const hasAudio = Utils.hasAudioPreview(track.url);
    const favoriteControl = await createFavoriteControl(track, hasAudio);
    if (currentRenderVersion !== renderVersion) return null;

    const titleRow = document.createElement('div');
    titleRow.className = 'd-flex align-items-center justify-content-between gap-2';
    titleRow.append(h5, favoriteControl);
    trackMeta.append(titleRow, pArtist, pListeners);

    const trackPlayer = document.createElement('div');
    trackPlayer.className = 'track-player me-sm-2';
    if (hasAudio) {
      const previewMount = document.createElement('div');
      previewMount.className = 'audio-preview-mount';
      previewMount.dataset.audioPreviewUrl = track.url;
      trackPlayer.appendChild(previewMount);
    } else {
      const noPreview = document.createElement('div');
      noPreview.className = Utils.getNoPreviewBadgeClasses('no-preview-badge');
      noPreview.textContent = 'Превью недоступно';
      trackPlayer.appendChild(noPreview);
    }

    trackItem.append(img, trackMeta, trackPlayer);
    trackItemWrapper.appendChild(trackItem);
    return trackItemWrapper;
  };

  const displayResults = async () => {
    const currentRenderVersion = ++renderVersion;
    hidePopular();

    if (currentPage === 1) {
      resultsContainer.replaceChildren();
      resultsList = null;
    }

    const preparedTracks = getPreparedTracks();
    totalPages = Math.max(1, Math.ceil(preparedTracks.length / tracksPerPage));

    if (currentPage === 1) {
      resultsContainer.appendChild(buildResultsSummary(preparedTracks.length));
    }

    if (!preparedTracks.length) {
      hideSearchFilters();
      resultsContainer.insertAdjacentHTML(
        'beforeend',
        `
        <div class="text-center">
          <div class="alert alert-dark mt-5 alert-log d-inline-block">
            <i class="fas fa-info-circle"></i>
            По запросу "${escapeHtml(currentQuery || searchInput.value.trim())}" ничего не найдено
          </div>
        </div>
        `
      );
      return;
    }

    if (currentPage === 1) {
      showSearchFilters();
    }

    const listRoot = ensureResultsList();
    const startIndex = (currentPage - 1) * tracksPerPage;
    const pageTracks = preparedTracks.slice(startIndex, startIndex + tracksPerPage);

    let lastArtist = '';
    for (const track of pageTracks) {
      const artist = normalizeArtist(track);
      if (state.groupBy === 'artist' && artist !== lastArtist) {
        const groupHeader = document.createElement('li');
        groupHeader.className = 'search-group-title';
        const groupArtistButton = createArtistBioButton(artist, 'fw-semibold');
        groupHeader.appendChild(groupArtistButton);
        listRoot.appendChild(groupHeader);
        lastArtist = artist;
      }

      const trackCard = await renderTrackCard(track, currentRenderVersion);
      if (currentRenderVersion !== renderVersion || !trackCard) return;
      listRoot.appendChild(trackCard);
    }

    const oldButton = resultsContainer.querySelector('.load-more-container');
    if (oldButton) oldButton.remove();
    if (currentPage < totalPages) {
      resultsContainer.appendChild(createLoadMoreButton());
    }

    if (typeof Utils !== 'undefined' && typeof Utils.initAudioPreviews === 'function') {
      Utils.initAudioPreviews(resultsContainer);
    }
    syncArtistBioMarquee();
    window.setTimeout(syncArtistBioMarquee, 120);
  };

  const closeMobileNavbar = () => {
    if (!navbarCollapse) return;
    if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
      const collapseInstance = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
      collapseInstance.hide();
    } else {
      navbarCollapse.classList.remove('show');
    }

    if (navbarToggler) {
      navbarToggler.classList.remove('is-active');
      navbarToggler.setAttribute('aria-expanded', 'false');
    }
  };


  const runSearch = async (query) => {
    if (!query) return;
    currentQuery = query;
    currentPage = 1;
    resultsList = null;
    resultsContainer.replaceChildren();
    showLoader();

    const cacheKey = `music_search_${query}`;
    const cached = getCachedTrend(cacheKey);
    if (cached) {
      allTracks = cached;
      populateArtistFilterOptions();
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
      populateArtistFilterOptions();
      await displayResults();
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
  };

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      const searchPageUrl = searchForm.getAttribute('action') || '/';
      window.location.assign(searchPageUrl);
      return;
    }
    closeMobileNavbar();
    await runSearch(query);
  });

  searchInput.addEventListener('input', () => {
    if (!searchInput.value.trim()) {
      const searchPageUrl = searchForm.getAttribute('action') || '/';
      window.location.assign(searchPageUrl);
    }
  });

  listenersSortControls.forEach((control) => {
    control.addEventListener('change', async () => {
      state.listenersSort = control.value || 'default';
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
      Utils?.closeParentOffcanvas?.(control);
    });
  });

  groupByControls.forEach((control) => {
    control.addEventListener('change', async () => {
      state.groupBy = control.value || 'none';
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
      Utils?.closeParentOffcanvas?.(control);
    });
  });

  artistFilterControls.forEach((control) => {
    control.addEventListener('change', async () => {
      state.artistFilter = control.value || 'all';
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
      Utils?.closeParentOffcanvas?.(control);
    });
  });

  resetFilterButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.listenersSort = 'desc';
      state.groupBy = 'none';
      state.artistFilter = 'all';
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
      Utils?.closeParentOffcanvas?.(button);
    });
  });

  resetSearchButtons.forEach((button) => {
    button.addEventListener('click', clearSearch);
  });

  syncControlValues();
  prepareSearchFilters();
  if (!marqueeResizeBound) {
    window.addEventListener('resize', scheduleArtistBioMarqueeSync);
    marqueeResizeBound = true;
  }

  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) {
    searchInput.value = initialQuery;
    runSearch(initialQuery);
  }
};

document.addEventListener('DOMContentLoaded', setupMusicSearch);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TREND_CACHE_TTL,
    escapeHtml,
    getCachedTrend,
    setCachedTrend,
    parseListeners,
    getTrackPopularity,
    normalizeArtist,
    prepareTracks,
  };
}
