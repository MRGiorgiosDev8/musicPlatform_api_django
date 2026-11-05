/**
 * Публичный плейлист профиля: лайк, вид (grid/list), фильтр по артистам,
 * пагинация с load-more, marquee, управление аудио. Инициализируется на
 * DOMContentLoaded. В window ничего не пишет; наружу отдаёт только CustomEvent'ы
 * publicPlaylist:* и CJS-мост module.exports. ESM-экспортов намеренно нет.
 */

const normalizePublicArtist = (value: unknown): string => String(value || '').trim();

interface PublicTrackRecord {
  element: HTMLElement;
  artist: string;
  artistKey: string;
  index: number;
}

const buildPublicTrackRecords = (items: HTMLElement[] = []): PublicTrackRecord[] =>
  Array.from(items).map((item, idx) => {
    const card = item.querySelector<HTMLElement>('.track-playlist');
    const artistButton = card?.querySelector<HTMLElement>('.artist-bio-trigger');
    const artistName = artistButton ? artistButton.textContent.trim() : '';
    return {
      element: item,
      artist: artistName,
      artistKey: artistName.toLowerCase(),
      index: idx,
    };
  });

interface PublicPlaylistState {
  artistFilter?: string;
}

const computePublicPlaylistView = (
  trackRecords: PublicTrackRecord[] = [],
  state: PublicPlaylistState = {}
): { filtered: PublicTrackRecord[]; sorted: PublicTrackRecord[]; hasMatches: boolean } => {
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

type PublicPlaylistViewMode = 'grid' | 'list';

const resolvePublicPlaylistViewMode = (mode: string): PublicPlaylistViewMode =>
  mode === 'grid' ? 'grid' : 'list';

const getPublicPlaylistViewStorageKey = (username = ''): string =>
  `publicPlaylistView:${username || 'default'}`;

interface PublicPlaylistPagination {
  maxVisible: number;
  visibleIndexes: number[];
  newlyVisibleIndexes: number[];
  hasMore: boolean;
}

const computePublicPlaylistPagination = (
  totalItems: number,
  visibleTracksCount: number,
  previousVisibleCount = 0
): PublicPlaylistPagination => {
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const maxVisible = Math.min(Math.max(0, Number(visibleTracksCount) || 0), safeTotal);
  const prevVisible = Math.min(Math.max(0, Number(previousVisibleCount) || 0), safeTotal);

  const visibleIndexes: number[] = [];
  const newlyVisibleIndexes: number[] = [];

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

// Внешние контракты (см. docs/frontend-global-contract.md): bare Utils из
// utils.js, а также window.* из favorite-button.ts и public_comments_animation.js.
// Типизированные проекции вычисляются в рантайме внутри initPublicPlaylistPage,
// чтобы не зависеть от порядка загрузки графа.
interface PublicPlaylistUtilsApi {
  initAudioPreviews(root: HTMLElement): void;
  syncInfiniteMarquee(options: Record<string, unknown>): void;
  createShowMoreButton(): HTMLElement;
  createChevronDownIcon(): HTMLElement;
  closeParentOffcanvas?(element: HTMLElement): void;
}

type PublicPlaylistBuildAuthHeadersFn = (
  includeJsonContentType?: boolean,
  includeCsrf?: boolean
) => Record<string, string>;

interface PublicCommentsAnimationApi {
  animateStatCount(element: HTMLElement, value: number): void;
}

const initPublicPlaylistPage = (): void => {
  const playlistsUtils = (globalThis as unknown as { Utils?: PublicPlaylistUtilsApi }).Utils;
  const authHeaders = (window as unknown as { buildAuthHeaders?: PublicPlaylistBuildAuthHeadersFn })
    .buildAuthHeaders;
  const triggerHapticFeedback = (window as unknown as { triggerHapticFeedback?: () => boolean })
    .triggerHapticFeedback;
  const publicCommentsAnimation = (
    window as unknown as { PublicCommentsAnimation?: PublicCommentsAnimationApi }
  ).PublicCommentsAnimation;

  const aboutTrigger = document.querySelector<HTMLElement>('.public-profile-about-trigger');
  if (aboutTrigger) {
    aboutTrigger.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      aboutTrigger.click();
    });
  }

  const likeRoot = document.querySelector<HTMLElement>('[data-public-like-root]');
  const likeButton = document.getElementById(
    'public-playlist-like-btn'
  ) as HTMLButtonElement | null;
  const likesCounters = Array.from(
    document.querySelectorAll<HTMLElement>('[data-public-likes-stat], #public-profile-likes-stat')
  );
  const username = likeRoot ? likeRoot.dataset.publicUsername || '' : '';

  if (
    typeof playlistsUtils !== 'undefined' &&
    typeof playlistsUtils.initAudioPreviews === 'function'
  ) {
    const root = document.getElementById('public-playlist-root');
    if (root) playlistsUtils.initAudioPreviews(root);
  }

  const updateLikeButton = (liked: boolean) => {
    if (!likeButton) return;
    likeButton.classList.add('btn', 'btn-sm', 'btn-danger');
    likeButton.setAttribute('aria-pressed', liked ? 'true' : 'false');
    likeButton.innerHTML = `<i class="bi bi-heart${liked ? '-fill' : ''}"></i><span class="ms-1">Лайк</span>`;
  };

  if (likesCounters.length) {
    likesCounters.forEach((likesCounter) => {
      const currentValue = Number(likesCounter.textContent) || 0;
      if (
        publicCommentsAnimation &&
        typeof publicCommentsAnimation.animateStatCount === 'function'
      ) {
        publicCommentsAnimation.animateStatCount(likesCounter, currentValue);
      }
    });
  }

  if (likeButton && username) {
    let pending = false;
    likeButton.addEventListener('click', async () => {
      if (pending) return;
      if (typeof triggerHapticFeedback === 'function') {
        triggerHapticFeedback();
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
              typeof authHeaders === 'function'
                ? authHeaders(true, true)
                : { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        );

        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error(String(payload.detail || `HTTP ${response.status}`));
        }

        updateLikeButton(Boolean(payload.liked_by_me));
        likesCounters.forEach((likesCounter) => {
          if (
            publicCommentsAnimation &&
            typeof publicCommentsAnimation.animateStatCount === 'function'
          ) {
            publicCommentsAnimation.animateStatCount(
              likesCounter,
              Number(payload.likes_count || 0)
            );
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
  let loadMoreContainer: HTMLElement | null = null;
  let activeAudio: HTMLAudioElement | null = null;
  let marqueeResizeRafId: number | null = null;
  let marqueeResizeBound = false;

  const artistControls = Array.from(
    document.querySelectorAll<HTMLSelectElement>('[data-public-artist-filter]')
  );
  const resetFilterButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-public-reset-filters]')
  );
  const countDisplays = Array.from(
    document.querySelectorAll<HTMLElement>('[data-public-count-display]')
  );
  const shownDisplays = Array.from(
    document.querySelectorAll<HTMLElement>('[data-public-shown-display]')
  );
  const filterMetaBlocks = Array.from(
    document.querySelectorAll<HTMLElement>('[data-public-filter-meta]')
  );

  const state: PublicPlaylistState = {
    artistFilter: artistControls[0]?.value || 'all',
  };

  const getTrackItems = (): HTMLElement[] =>
    trackList ? Array.from(trackList.querySelectorAll<HTMLElement>('.track-item-playlist')) : [];

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
      control.value = state.artistFilter || 'all';
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
    if (
      typeof playlistsUtils === 'undefined' ||
      typeof playlistsUtils.syncInfiniteMarquee !== 'function'
    )
      return;
    playlistsUtils.syncInfiniteMarquee({
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

  const createLoadMoreButton = (): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'load-more-container text-center';
    container.style.margin = '12px 0 8px';

    const button = playlistsUtils!.createShowMoreButton();
    button.addEventListener('click', () => {
      const previousVisible = visibleTracksCount;
      visibleTracksCount += pageSize;
      const newlyVisibleItems = renderTrackPagination(previousVisible);
      document.dispatchEvent(
        new CustomEvent('publicPlaylist:showMore', { detail: { items: newlyVisibleItems } })
      );
    });

    const arrowIcon = playlistsUtils!.createChevronDownIcon();

    button.appendChild(arrowIcon);
    container.appendChild(button);
    return container;
  };

  const renderTrackPagination = (previousVisibleCount = 0): HTMLElement[] => {
    const items = getTrackItems();
    if (!items.length) return [];

    const view = computePublicPlaylistView(trackRecords, state);
    const sorted = view.sorted;

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

    const page = computePublicPlaylistPagination(
      sorted.length,
      visibleTracksCount,
      previousVisibleCount
    );
    const newlyVisible: HTMLElement[] = [];

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

  const viewButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-track-view]'));
  const viewStorageKey = getPublicPlaylistViewStorageKey(username);
  const setViewMode = (mode: string) => {
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
        setViewMode(button.dataset.trackView || 'list');
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
      playlistsUtils?.closeParentOffcanvas?.(control);
    });
  });

  resetFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.artistFilter = 'all';
      syncControlValues();
      visibleTracksCount = pageSize;
      renderTrackPagination(0);
      playlistsUtils?.closeParentOffcanvas?.(button);
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

// CJS-мост: инертен в браузере (module не определён), нужен для CommonJS-загрузки.
// Декларация `module` уже глобальна (favorite-button.ts), повторно не объявляем.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initPublicPlaylistPage,
    resolvePublicPlaylistViewMode,
    getPublicPlaylistViewStorageKey,
    computePublicPlaylistPagination,
  };
}

export {};
