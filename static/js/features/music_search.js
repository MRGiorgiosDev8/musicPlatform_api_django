const TREND_CACHE_TTL = 10 * 60 * 1000;

const escapeHtml = (unsafe) => {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  const popular = document.getElementById("popular-block");
  if (popular) popular.style.display = "none";
};

const showPopular = () => {
  const popular = document.getElementById("popular-block");
  if (popular) popular.style.display = "";
};

let activeAudio = null;

const setupMusicSearch = () => {
  const searchForm = document.querySelector(".form-search");
  const searchInput = document.querySelector(".input-search");
  if (!searchForm || !searchInput) return;

  const isSearchPage = document.body?.dataset?.isSearchPage === "true";
  if (!isSearchPage) return;

  const isAuthenticated = document.body?.dataset?.isAuthenticated === "true";
  const navbarCollapse = document.getElementById("navbarNav");
  const navbarToggler = document.querySelector(".hamburger.hamburger--elastic");
  const resultsContainer = document.getElementById("searchResults");
  const searchLoader = document.getElementById("searchLoader");
  const searchBreadcrumb = document.getElementById("search-breadcrumb");
  if (!resultsContainer) return;

  if (searchLoader && searchBreadcrumb) {
    searchBreadcrumb.insertAdjacentElement("afterend", searchLoader);
  }

  const listenersSortControls = Array.from(document.querySelectorAll("[data-search-listeners-sort]"));
  const groupByControls = Array.from(document.querySelectorAll("[data-search-group-by]"));
  const artistFilterControls = Array.from(document.querySelectorAll("[data-search-artist-filter]"));
  const resetFilterButtons = Array.from(document.querySelectorAll("[data-search-reset-filters]"));
  const resetSearchButtons = Array.from(document.querySelectorAll("[data-search-reset-query]"));

  const showLoader = () => window.Spinners?.search?.show?.();
  const hideLoader = () => window.Spinners?.search?.hide?.();

  const tracksPerPage = 6;
  let currentPage = 1;
  let totalPages = 1;
  let allTracks = [];
  let renderVersion = 0;
  let resultsList = null;
  let currentQuery = "";

  const state = {
    listenersSort: "default",
    groupBy: "none",
    artistFilter: "all",
  };

  const parseListeners = (value) => {
    if (typeof value === "number") return value;
    const cleaned = String(value ?? "").replace(/[^\d]/g, "");
    return cleaned ? Number(cleaned) : 0;
  };

  const getTrackPopularity = (track) => {
    const listeners = parseListeners(track?.listeners);
    if (listeners > 0) return listeners;
    return parseListeners(track?.playcount);
  };

  const normalizeArtist = (track) => {
    const artist = String(track?.artist ?? "").trim();
    return artist || "Unknown artist";
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
    const artists = Array.from(
      new Set(allTracks.map((track) => normalizeArtist(track)))
    ).sort((a, b) => a.localeCompare(b, "ru"));

    artistFilterControls.forEach((control) => {
      control.replaceChildren();
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "Все артисты";
      control.appendChild(allOption);

      artists.forEach((artist) => {
        const option = document.createElement("option");
        option.value = artist.toLowerCase();
        option.textContent = artist;
        control.appendChild(option);
      });
    });

    const hasSelectedArtist = artists.some((artist) => artist.toLowerCase() === state.artistFilter);
    if (state.artistFilter !== "all" && !hasSelectedArtist) {
      state.artistFilter = "all";
    }
    syncControlValues();
  };

  const getPreparedTracks = () => {
    const filtered = allTracks.filter((track) => {
      if (state.artistFilter === "all") return true;
      return normalizeArtist(track).toLowerCase() === state.artistFilter;
    });

    if (state.listenersSort === "default") return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const aListeners = getTrackPopularity(a);
      const bListeners = getTrackPopularity(b);
      return state.listenersSort === "asc"
        ? aListeners - bListeners
        : bListeners - aListeners;
    });

    return sorted;
  };

  const ensureResultsList = () => {
    if (resultsList && resultsContainer.contains(resultsList)) return resultsList;
    resultsList = document.createElement("ul");
    resultsList.className = "track-list list-unstyled p-0 m-0 mt-4";
    resultsContainer.appendChild(resultsList);
    return resultsList;
  };

  const resetSearchState = () => {
    allTracks = [];
    currentPage = 1;
    totalPages = 1;
    resultsList = null;
    currentQuery = "";
    resultsContainer.replaceChildren();
  };

  const clearSearch = () => {
    const searchPageUrl = searchForm.getAttribute("action") || "/";
    window.location.assign(searchPageUrl);
  };

  const buildResultsSummary = (filteredCount) => {
    const summary = document.createElement("div");
    summary.className = "search-results-summary d-flex flex-wrap align-items-center justify-content-between gap-2";

    const meta = document.createElement("div");
    meta.className = "search-results-summary-meta small text-dark";
    const queryLabel = currentQuery ? `"${escapeHtml(currentQuery)}"` : "—";
    
    const searchIcon = document.createElement("i");
    searchIcon.className = "bi bi-search text-danger me-2";
    searchIcon.style.fontSize = "0.875rem";
    
    const labelText = document.createElement("span");
    labelText.textContent = "Запрос: ";
    labelText.className = "text-dark";
    
    const queryText = document.createElement("strong");
    queryText.textContent = queryLabel;
    queryText.className = "text-danger";
    
    meta.appendChild(searchIcon);
    meta.appendChild(labelText);
    meta.appendChild(queryText);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "btn btn-sm btn-outline-danger";
    clearButton.textContent = "Очистить поиск";
    clearButton.addEventListener("click", clearSearch);

    summary.append(meta, clearButton);
    return summary;
  };

  const createFavoriteControl = async (track) => {
    const container = document.createElement("div");
    container.className = "d-flex align-items-center";
    if (!isAuthenticated || typeof window.createFavoriteButtonWithCheck !== "function") {
      return container;
    }

    try {
      const favoriteButton = await window.createFavoriteButtonWithCheck(track.name, track.artist);
      const syncFavoriteVisualState = () => {
        const isActive = favoriteButton.getAttribute("aria-pressed") === "true";
        const icon = favoriteButton.querySelector("i");
        if (icon) {
          icon.className = "bi bi-heart-fill";
          icon.style.fontSize = isActive ? "1.1rem" : "1.4rem";
          icon.style.lineHeight = "34px";
          icon.style.display = "inline-block";
          icon.style.verticalAlign = "middle";
          icon.style.margin = "0";
        }

        if (isActive) {
          favoriteButton.style.background = "#dc3545";
          favoriteButton.style.color = "#ffffff";
        } else {
          favoriteButton.style.background = "transparent";
          favoriteButton.style.color = "rgba(220, 53, 69, 0.72)";
        }

        favoriteButton.style.border = "none";
        favoriteButton.style.borderRadius = "50%";
        favoriteButton.style.width = "33px";
        favoriteButton.style.height = "33px";
        favoriteButton.style.padding = "0";
        favoriteButton.style.textAlign = "center";
        favoriteButton.style.paddingTop = "3px";
      };

      const applyIconOnlyStyle = () => {
        favoriteButton.className = "favorite-icon-btn";
        favoriteButton.style.boxShadow = "none";
        favoriteButton.style.minWidth = "34px";
        favoriteButton.style.lineHeight = "1";
        favoriteButton.style.display = "inline-flex";
        favoriteButton.style.alignItems = "center";
        favoriteButton.style.justifyContent = "center";
        favoriteButton.style.boxSizing = "border-box";
        favoriteButton.style.flexShrink = "0";
        favoriteButton.style.aspectRatio = "1 / 1";
        favoriteButton.style.cursor = "pointer";
        favoriteButton.style.outline = "none";
        favoriteButton.style.transition = "background-color 0.2s ease, color 0.2s ease";
        syncFavoriteVisualState();
      };

      applyIconOnlyStyle();
      const styleSyncObserver = new MutationObserver(() => applyIconOnlyStyle());
      styleSyncObserver.observe(favoriteButton, {
        attributes: true,
        attributeFilter: ["aria-pressed"],
        childList: true,
        subtree: true,
      });

      favoriteButton.addEventListener("mouseenter", () => {
        const isActive = favoriteButton.getAttribute("aria-pressed") === "true";
        if (!isActive) favoriteButton.style.color = "rgba(220, 53, 69, 0.95)";
      });
      favoriteButton.addEventListener("mouseleave", () => {
        const isActive = favoriteButton.getAttribute("aria-pressed") === "true";
        if (!isActive) favoriteButton.style.color = "rgba(220, 53, 69, 0.72)";
      });

      container.appendChild(favoriteButton);
    } catch (error) {
      console.error("Favorite button init error:", error);
    }

    return container;
  };

  const createLoadMoreButton = () => {
    const loadMoreContainer = document.createElement("div");
    loadMoreContainer.className = "load-more-container";
    loadMoreContainer.style.textAlign = "center";
    loadMoreContainer.style.margin = "20px 0";

    const loadMoreButton = document.createElement("button");
    loadMoreButton.className = "btn btn-sm btn-show-more mt-3";
    loadMoreButton.style.transform = "scale(1.1)";
    loadMoreButton.style.transition = "transform 0.3s ease, background-color 0.3s ease";
    loadMoreButton.style.backgroundColor = "transparent";
    loadMoreButton.style.border = "none";
    loadMoreButton.style.outline = "none";
    loadMoreButton.style.opacity = "0.90";

    loadMoreButton.addEventListener("mouseenter", () => {
      loadMoreButton.style.transform = "scale(0.95)";
    });
    loadMoreButton.addEventListener("mouseleave", () => {
      loadMoreButton.style.transform = "scale(1.1)";
    });
    loadMoreButton.addEventListener("click", async () => {
      currentPage += 1;
      await displayResults();
    });

    const arrowIcon = document.createElement("i");
    arrowIcon.className = "bi bi-chevron-double-down";
    arrowIcon.setAttribute("aria-hidden", "true");
    arrowIcon.style.fontSize = "2rem";
    arrowIcon.style.lineHeight = "1";
    arrowIcon.style.color = "var(--color-primary)";

    loadMoreButton.appendChild(arrowIcon);
    loadMoreButton.disabled = currentPage >= totalPages;
    loadMoreContainer.appendChild(loadMoreButton);
    return loadMoreContainer;
  };

  const renderTrackCard = async (track, currentRenderVersion) => {
    const trackItemWrapper = document.createElement("li");
    trackItemWrapper.className = "track-item-playlist";

    const trackItem = document.createElement("div");
    trackItem.className = "track-playlist mb-3";

    const img = document.createElement("img");
    img.src = track.image_url;
    img.alt = escapeHtml(track.name);
    img.className = "track-image shadow-sm img-fluid";
    img.loading = "lazy";

    const trackMeta = document.createElement("div");
    trackMeta.className = "track-meta";

    const h5 = document.createElement("h5");
    h5.className = "track-title text-start";
    h5.textContent = track.name;

    const pArtist = document.createElement("p");
    pArtist.className = "track-artist";

    const spanArtist = document.createElement("span");
    spanArtist.style.color = "black";
    spanArtist.style.borderLeft = "3px solid rgba(255, 13, 0, 0.73)";
    spanArtist.style.borderRadius = "3px";
    spanArtist.style.paddingLeft = "4px";
    spanArtist.textContent = `Артист: ${normalizeArtist(track)}`;
    pArtist.appendChild(spanArtist);

    const pListeners = document.createElement("p");
    pListeners.className = "track-listeners text-black mb-0 small";
    pListeners.textContent = `Прослушиваний: ${getTrackPopularity(track)}`;

    const favoriteControl = await createFavoriteControl(track);
    if (currentRenderVersion !== renderVersion) return null;

    const titleRow = document.createElement("div");
    titleRow.className = "d-flex align-items-center justify-content-between gap-2";
    titleRow.append(h5, favoriteControl);
    trackMeta.append(titleRow, pArtist, pListeners);

    const trackPlayer = document.createElement("div");
    trackPlayer.className = "track-player me-sm-2";
    const hasAudio = track.url && /\.(mp3|m4a)(\?.*)?$/i.test(track.url);

    if (hasAudio) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.style.filter = "sepia(1) saturate(2) hue-rotate(320deg)";

      const source = document.createElement("source");
      source.src = track.url;
      audio.appendChild(source);

      audio.addEventListener("play", () => {
        if (activeAudio && activeAudio !== audio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
        }
        activeAudio = audio;
      });
      audio.addEventListener("ended", () => {
        if (activeAudio === audio) activeAudio = null;
      });

      trackPlayer.appendChild(audio);
    } else {
      const noPreview = document.createElement("div");
      noPreview.className = "fs-6 text-muted d-inline-block border-bottom border-danger";
      noPreview.textContent = "Превью недоступно";
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
      resultsContainer.insertAdjacentHTML(
        "beforeend",
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

    const listRoot = ensureResultsList();
    const startIndex = (currentPage - 1) * tracksPerPage;
    const pageTracks = preparedTracks.slice(startIndex, startIndex + tracksPerPage);

    let lastArtist = "";
    for (const track of pageTracks) {
      const artist = normalizeArtist(track);
      if (state.groupBy === "artist" && artist !== lastArtist) {
        const groupHeader = document.createElement("li");
        groupHeader.className = "search-group-title";
        groupHeader.textContent = artist;
        listRoot.appendChild(groupHeader);
        lastArtist = artist;
      }

      const trackCard = await renderTrackCard(track, currentRenderVersion);
      if (currentRenderVersion !== renderVersion || !trackCard) return;
      listRoot.appendChild(trackCard);
    }

    const oldButton = resultsContainer.querySelector(".load-more-container");
    if (oldButton) oldButton.remove();
    if (currentPage < totalPages) {
      resultsContainer.appendChild(createLoadMoreButton());
    }
  };

  const closeMobileNavbar = () => {
    if (!navbarCollapse) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Collapse) {
      const collapseInstance = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
      collapseInstance.hide();
    } else {
      navbarCollapse.classList.remove("show");
    }

    if (navbarToggler) {
      navbarToggler.classList.remove("is-active");
      navbarToggler.setAttribute("aria-expanded", "false");
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
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      allTracks = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      setCachedTrend(cacheKey, allTracks);
      populateArtistFilterOptions();
      await displayResults();
    } catch (error) {
      console.error("Search Error:", error);
      resultsContainer.insertAdjacentHTML(
        "beforeend",
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

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      const searchPageUrl = searchForm.getAttribute("action") || "/";
      window.location.assign(searchPageUrl);
      return;
    }
    closeMobileNavbar();
    await runSearch(query);
  });

  searchInput.addEventListener("input", () => {
    if (!searchInput.value.trim()) {
      const searchPageUrl = searchForm.getAttribute("action") || "/";
      window.location.assign(searchPageUrl);
    }
  });

  listenersSortControls.forEach((control) => {
    control.addEventListener("change", async () => {
      state.listenersSort = control.value || "default";
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
    });
  });

  groupByControls.forEach((control) => {
    control.addEventListener("change", async () => {
      state.groupBy = control.value || "none";
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
    });
  });

  artistFilterControls.forEach((control) => {
    control.addEventListener("change", async () => {
      state.artistFilter = control.value || "all";
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
    });
  });

  resetFilterButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      state.listenersSort = "default";
      state.groupBy = "none";
      state.artistFilter = "all";
      syncControlValues();
      currentPage = 1;
      if (currentQuery) await displayResults();
    });
  });

  resetSearchButtons.forEach((button) => {
    button.addEventListener("click", clearSearch);
  });

  syncControlValues();

  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    searchInput.value = initialQuery;
    runSearch(initialQuery);
  }
};

document.addEventListener("DOMContentLoaded", setupMusicSearch);
