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
  const likesCounter = document.getElementById('public-profile-likes-stat');
  const username = likeRoot ? likeRoot.dataset.publicUsername : '';

  const updateLikeButton = (liked) => {
    if (!likeButton) return;
    likeButton.className = `btn btn-sm ${liked ? 'btn-danger' : 'btn-outline-danger'}`;
    likeButton.setAttribute('aria-pressed', liked ? 'true' : 'false');
    likeButton.innerHTML = `<i class="bi bi-heart${liked ? '-fill' : ''}"></i><span class="ms-1">Лайк</span>`;
  };

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
        if (likesCounter) likesCounter.textContent = String(payload.likes_count || 0);
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
  const pageSize = 6;
  let visibleTracksCount = pageSize;
  let loadMoreContainer = null;

  const getTrackItems = () => Array.from(playlistRoot.querySelectorAll('.track-item-playlist'));

  const createLoadMoreButton = () => {
    const container = document.createElement('div');
    container.className = 'load-more-container text-center';
    container.style.margin = '12px 0 8px';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-show-more mt-2';
    button.style.transform = 'scale(1.1)';
    button.style.transition = 'transform 0.3s ease';
    button.style.backgroundColor = 'transparent';
    button.style.border = 'none';
    button.style.outline = 'none';

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(0.95)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('click', () => {
      const previousVisible = visibleTracksCount;
      visibleTracksCount += pageSize;
      const newlyVisibleItems = renderTrackPagination(previousVisible);
      document.dispatchEvent(
        new CustomEvent('publicPlaylist:showMore', { detail: { items: newlyVisibleItems } })
      );
    });

    const arrowIcon = document.createElement('i');
    arrowIcon.className = 'bi bi-chevron-double-down';
    arrowIcon.setAttribute('aria-hidden', 'true');
    arrowIcon.style.fontSize = '2rem';
    arrowIcon.style.lineHeight = '1';
    arrowIcon.style.color = 'var(--color-primary)';

    button.appendChild(arrowIcon);
    container.appendChild(button);
    return container;
  };

  const renderTrackPagination = (previousVisibleCount = 0) => {
    const items = getTrackItems();
    if (!items.length) return [];

    const page = computePublicPlaylistPagination(
      items.length,
      visibleTracksCount,
      previousVisibleCount
    );
    const newlyVisible = [];

    items.forEach((item, idx) => {
      const shouldShow = idx < page.maxVisible;
      item.style.display = shouldShow ? '' : 'none';
      if (shouldShow && page.newlyVisibleIndexes.includes(idx)) {
        item.style.opacity = '1';
        item.style.transform = 'none';
        newlyVisible.push(item);
      }
    });

    if (!loadMoreContainer) {
      loadMoreContainer = createLoadMoreButton();
      playlistRoot.appendChild(loadMoreContainer);
    }
    loadMoreContainer.style.display = page.hasMore ? '' : 'none';

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

  renderTrackPagination(0);
  document.dispatchEvent(new Event('publicPlaylist:rendered'));

  let activeAudio = null;
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
