const normalizePublicArtist = (value) => String(value || '').trim();

const buildPublicTrackRecords = (items = []) =>
  Array.from(items).map((item, idx) => {
    const card = item.querySelector('.track-playlist');
    const artistButton = card?.querySelector('.artist-bio-trigger');
    const artistName = artistButton ? artistButton.textContent.trim() : '';
    return {
      element: item,
      artist: artistName,
      artistKey: artistName.toLowerCase(),
      index: idx,
    };
  });

const computePublicPlaylistView = (trackRecords = [], state = {}) => {
  const artistFilter = state.artistFilter || 'all';

  const filtered = trackRecords.filter(
    (record) => artistFilter === 'all' || record.artistKey === artistFilter
  );

  const sorted = [...filtered].sort((a, b) => a.index - b.index);

  return {
    filtered,
    sorted,
    hasMatches: sorted.length > 0,
  };
};

const resolvePublicPlaylistViewMode = (mode) => (mode === 'grid' ? 'grid' : 'list');

const getPublicPlaylistViewStorageKey = (username = '') =>
  `publicPlaylistView:${username || 'default'}`;

const computePublicPlaylistPagination = (
  totalItems,
  visibleTracksCount,
  previousVisibleCount = 0
) => {
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const maxVisible = Math.min(Math.max(0, Number(visibleTracksCount) || 0), safeTotal);
  const prevVisible = Math.min(Math.max(0, Number(previousVisibleCount) || 0), safeTotal);

  const visibleIndexes = [];
  const newlyVisibleIndexes = [];

  for (let idx = 0; idx < safeTotal; idx += 1) {
    if (idx < maxVisible) {
      visibleIndexes.push(idx);
      if (idx >= prevVisible) {
        newlyVisibleIndexes.push(idx);
      }
    }
  }

  return {
    maxVisible,
    visibleIndexes,
    newlyVisibleIndexes,
    hasMore: maxVisible < safeTotal,
  };
};

const initPublicPlaylistPage = () => {
  const likeRoot = document.querySelector('[data-public-like-root]');
  const likeButton = document.getElementById('public-playlist-like-btn');
  const likesCounters = Array.from(
    document.querySelectorAll('[data-public-likes-stat], #public-profile-likes-stat')
  );
  const username = likeRoot ? likeRoot.dataset.publicUsername : '';

  if (typeof Utils !== 'undefined' && typeof Utils.initAudioPreviews === 'function') {
    const root = document.getElementById('public-playlist-root');
    if (root) Utils.initAudioPreviews(root);
  }

  const updateLikeButton = (liked) => {
    if (!likeButton) return;
    likeButton.className = 'btn btn-sm btn-danger';
    likeButton.setAttribute('aria-pressed', liked ? 'true' : 'false');
    likeButton.innerHTML = `<i class="bi bi-heart${liked ? '-fill' : ''}"></i><span class="ms-1">Лайк</span>`;
  };

  if (likesCounters.length) {
    likesCounters.forEach((likesCounter) => {
      const currentValue = Number(likesCounter.textContent) || 0;
      if (
        window.PublicCommentsAnimation &&
        typeof window.PublicCommentsAnimation.animateStatCount === 'function'
      ) {
        window.PublicCommentsAnimation.animateStatCount(likesCounter, currentValue);
      }
    });
  }

  if (likeButton && username) {
    let pending = false;
    likeButton.addEventListener('click', async () => {
      if (pending) return;
      if (typeof window.triggerHapticFeedback === 'function') {
        window.triggerHapticFeedback();
      }
      pending = true;
      likeButton.disabled = true;

      const isLiked = likeButton.getAttribute('aria-pressed') === 'true';
      const method = isLiked ? 'DELETE' : 'POST';
      try {
        const response = await fetch(
          `/api/playlists/public/${encodeURIComponent(username)}/like/`,
          {
            method,
            credentials: 'same-origin',
            headers:
              typeof window.buildAuthHeaders === 'function'
                ? window.buildAuthHeaders(true, true)
                : { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.detail || `HTTP ${response.status}`);
        }

        updateLikeButton(Boolean(payload.liked_by_me));
        likesCounters.forEach((likesCounter) => {
          if (
            window.PublicCommentsAnimation &&
            typeof window.PublicCommentsAnimation.animateStatCount === 'function'
          ) {
            window.PublicCommentsAnimation.animateStatCount(likesCounter, payload.likes_count || 0);
          } else {
            likesCounter.textContent = String(payload.likes_count || 0);
          }
        });
      } catch (error) {
        console.error('Public like toggle failed:', error);
      } finally {
        pending = false;
        likeButton.disabled = false;
      }
    });
  }

  const playlistRoot = document.getElementById('public-playlist-root');
  if (!playlistRoot) return;

  const trackList = playlistRoot.querySelector('.track-list');
  const pageSize = 6;
  let visibleTracksCount = pageSize;
  let loadMoreContainer = null;
  let activeAudio = null;
  let marqueeResizeRafId = null;
  let marqueeResizeBound = false;

  // Filter controls
  const artistControls = Array.from(document.querySelectorAll('[data-public-artist-filter]'));
  const resetFilterButtons = Array.from(document.querySelectorAll('[data-public-reset-filters]'));
  const countDisplays = Array.from(document.querySelectorAll('[data-public-count-display]'));
  const shownDisplays = Array.from(document.querySelectorAll('[data-public-shown-display]'));
  const filterMetaBlocks = Array.from(document.querySelectorAll('[data-public-filter-meta]'));

  const state = {
    artistFilter: artistControls[0]?.value || 'all',
  };

  const getTrackItems = () =>
    trackList ? Array.from(trackList.querySelectorAll('.track-item-playlist')) : [];

  const trackRecords = buildPublicTrackRecords(getTrackItems());

  const buildArtistFilterOptions = () => {
    if (!artistControls.length) return;
    const artists = Array.from(
      new Set(trackRecords.map((record) => record.artist).filter((artist) => artist.length > 0))
    ).sort((a, b) => a.localeCompare(b, 'ru'));

    artistControls.forEach((control) => {
      artists.forEach((artist) => {
        const option = document.createElement('option');
        option.value = artist.toLowerCase();
        option.textContent = artist;
        control.appendChild(option);
      });
    });
  };

  const syncControlValues = () => {
    artistControls.forEach((control) => {
      control.value = state.artistFilter;
    });
  };

  const clearNoMatchesState = () => {
    const existingAlert = playlistRoot.querySelector('.alert.alert-light.border.mb-0');
    if (existingAlert) existingAlert.remove();
  };

  const showNoMatchesState = () => {
    const existingAlert = playlistRoot.querySelector('.alert.alert-light.border.mb-0');
    if (existingAlert) return;
    const alert = document.createElement('div');
    alert.className = 'alert alert-light border mb-0';
    alert.textContent = 'По выбранному фильтру треки не найдены.';
    playlistRoot.appendChild(alert);
  };

  const syncArtistBioMarquee = () => {
    if (typeof Utils === 'undefined' || typeof Utils.syncInfiniteMarquee !== 'function') return;
    Utils.syncInfiniteMarquee({
      container: playlistRoot,
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

  const createLoadMoreButton = () => {
    const container = document.createElement('div');
    container.className = 'load-more-container text-center';
    container.style.margin = '12px 0 8px';

    const button = Utils.createShowMoreButton();
    button.addEventListener('click', () => {
      const previousVisible = visibleTracksCount;
      visibleTracksCount += pageSize;
      const newlyVisibleItems = renderTrackPagination(previousVisible);
      document.dispatchEvent(
        new CustomEvent('publicPlaylist:showMore', { detail: { items: newlyVisibleItems } })
      );
    });

    const arrowIcon = Utils.createChevronDownIcon();

    button.appendChild(arrowIcon);
    container.appendChild(button);
    return container;
  };

  const renderTrackPagination = (previousVisibleCount = 0) => {
    const items = getTrackItems();
    if (!items.length) return [];

    const view = computePublicPlaylistView(trackRecords, state);
    const sorted = view.sorted;

    // Hide all items first
    items.forEach((item) => {
      item.style.display = 'none';
    });

    if (!sorted.length) {
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      showNoMatchesState();
      countDisplays.forEach((block) => {
        block.textContent = '0';
      });
      shownDisplays.forEach((block) => {
        block.textContent = '0';
      });
      filterMetaBlocks.forEach((block) => {
        block.textContent = 'Найдено: 0 треков';
      });
      return [];
    }

    clearNoMatchesState();

    // Show filtered items
    const page = computePublicPlaylistPagination(
      sorted.length,
      visibleTracksCount,
      previousVisibleCount
    );
    const newlyVisible = [];

    sorted.forEach((record, idx) => {
      const shouldShow = idx < page.maxVisible;
      record.element.style.display = shouldShow ? '' : 'none';
      if (shouldShow && page.newlyVisibleIndexes.includes(idx)) {
        record.element.style.opacity = '1';
        record.element.style.transform = 'none';
        newlyVisible.push(record.element);
      }
    });

    if (!loadMoreContainer) {
      loadMoreContainer = createLoadMoreButton();
      playlistRoot.appendChild(loadMoreContainer);
    }
    loadMoreContainer.style.display = page.hasMore ? '' : 'none';

    // Update counters
    countDisplays.forEach((block) => {
      block.textContent = `${sorted.length}`;
    });
    shownDisplays.forEach((block) => {
      block.textContent = `${page.maxVisible}`;
    });
    filterMetaBlocks.forEach((block) => {
      block.textContent = `Показано: ${page.maxVisible} из ${sorted.length}`;
    });

    syncArtistBioMarquee();

    return newlyVisible;
  };

  const viewButtons = Array.from(document.querySelectorAll('[data-track-view]'));
  const viewStorageKey = getPublicPlaylistViewStorageKey(username);
  const setViewMode = (mode) => {
    const nextMode = resolvePublicPlaylistViewMode(mode);
    playlistRoot.classList.toggle('public-view-grid', nextMode === 'grid');
    viewButtons.forEach((button) => {
      const isActive = button.dataset.trackView === nextMode;
      button.classList.toggle('active', isActive);
    });
    localStorage.setItem(viewStorageKey, nextMode);
    document.dispatchEvent(
      new CustomEvent('publicPlaylist:viewChanged', { detail: { mode: nextMode } })
    );
  };


  if (viewButtons.length) {
    const savedMode = localStorage.getItem(viewStorageKey) || 'list';
    setViewMode(savedMode);
    viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setViewMode(button.dataset.trackView);
      });
    });
  }

  if (trackList) {
    buildArtistFilterOptions();
    syncControlValues();
  }
  
  artistControls.forEach((control) => {
    control.addEventListener('change', () => {
      state.artistFilter = control.value || 'all';
      syncControlValues();
      visibleTracksCount = pageSize;
      renderTrackPagination(0);
      Utils?.closeParentOffcanvas?.(control);
    });
  });

  resetFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.artistFilter = 'all';
      syncControlValues();
      visibleTracksCount = pageSize;
      renderTrackPagination(0);
      Utils?.closeParentOffcanvas?.(button);
    });
  });

  renderTrackPagination(0);
  window.setTimeout(syncArtistBioMarquee, 100);
  if (!marqueeResizeBound) {
    window.addEventListener('resize', scheduleArtistBioMarqueeSync);
    marqueeResizeBound = true;
  }
  document.dispatchEvent(new Event('publicPlaylist:rendered'));

  playlistRoot.addEventListener(
    'play',
    (event) => {
      const audio = event.target;
      if (!(audio instanceof HTMLAudioElement)) return;
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
      }
      activeAudio = audio;
    },
    true
  );
  playlistRoot.addEventListener(
    'ended',
    (event) => {
      const audio = event.target;
      if (!(audio instanceof HTMLAudioElement)) return;
      if (activeAudio === audio) activeAudio = null;
    },
    true
  );
};

document.addEventListener('DOMContentLoaded', initPublicPlaylistPage);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initPublicPlaylistPage,
    resolvePublicPlaylistViewMode,
    getPublicPlaylistViewStorageKey,
    computePublicPlaylistPagination,
  };
}
