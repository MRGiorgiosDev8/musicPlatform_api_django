const buildYearChartUrl = (baseUrl, genre = '') =>
  genre ? `${baseUrl}?genre=${encodeURIComponent(genre)}` : baseUrl;

const extractYearTracks = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Неверный формат ответа сервера');
  }
  return Array.isArray(data.tracks) ? data.tracks : [];
};

const hasAudioPreview = (url) => {
  if (typeof Utils !== 'undefined' && typeof Utils.hasAudioPreview === 'function') {
    return Utils.hasAudioPreview(url);
  }
  return Boolean(url && /\.(mp3|m4a)(\?.*)?$/i.test(url));
};

const resolveTrackPlaycount = (track) => {
  const playcount = track?.playcount;
  if (playcount !== undefined && playcount !== null && playcount !== '') {
    return String(playcount);
  }
  const listeners = track?.listeners;
  if (listeners !== undefined && listeners !== null && listeners !== '') {
    return String(listeners);
  }
  return 0;
};

const Year2025App = {
  URL: '/music_api/apple-chart/',
  cache: {},
  activeAudio: null,
  audioControlsInitialized: false,
  renderVersion: 0,
  isAuthenticated: false,
  marqueeResizeRafId: null,
  marqueeResizeBound: false,

  init() {
    this.isAuthenticated = document.body?.dataset?.isAuthenticated === 'true';
    Utils.initGenreButtons('year-genre-container', (genre) => this.load(genre), true);
    this.initAudioControls();
    if (!this.marqueeResizeBound) {
      window.addEventListener('resize', () => this.scheduleTitleMarqueeSync());
      this.marqueeResizeBound = true;
    }
    this.load();
  },

  scheduleTitleMarqueeSync() {
    if (this.marqueeResizeRafId) {
      window.cancelAnimationFrame(this.marqueeResizeRafId);
    }
    this.marqueeResizeRafId = window.requestAnimationFrame(() => {
      this.marqueeResizeRafId = null;
      this.syncTitleMarquee();
      this.syncArtistBioMarquee();
    });
  },

  syncTitleMarquee(container = document.getElementById('year2025-container')) {
    if (!container) {
      return;
    }

    const titles = container.querySelectorAll('.year-track-title');
    titles.forEach((title) => {
      const trackNode = title.querySelector('.year-track-title-track');
      const textNode = title.querySelector('.year-track-title-text');
      if (!trackNode || !textNode) {
        return;
      }

      title.classList.remove('is-marquee');
      title.style.removeProperty('--year-title-marquee-distance');
      title.style.removeProperty('--year-title-marquee-duration');
      title.style.removeProperty('--year-title-marquee-gap');

      const overflow = Math.ceil(textNode.scrollWidth - title.clientWidth);
      if (overflow <= 8) {
        return;
      }

      const gap = 18;
      const distance = Math.ceil(textNode.scrollWidth + gap);
      const duration = Math.max(4, Math.min(12, distance / 40));
      title.classList.add('is-marquee');
      title.style.setProperty('--year-title-marquee-distance', `${distance}px`);
      title.style.setProperty('--year-title-marquee-duration', `${duration}s`);
      title.style.setProperty('--year-title-marquee-gap', `${gap}px`);
    });
  },

  syncArtistBioMarquee(container = document.getElementById('year2025-container')) {
    if (!container) {
      return;
    }

    const triggers = container.querySelectorAll('.js-artist-bio-trigger');
    triggers.forEach((trigger) => {
      const trackNode = trigger.querySelector('.artist-bio-trigger-track');
      const textNode = trigger.querySelector('.artist-bio-trigger-text');
      if (!trackNode || !textNode) {
        return;
      }

      trigger.classList.remove('is-marquee');
      trigger.style.removeProperty('--artist-bio-marquee-distance');
      trigger.style.removeProperty('--artist-bio-marquee-duration');
      trigger.style.removeProperty('--artist-bio-marquee-gap');

      const overflow = Math.ceil(textNode.scrollWidth - trigger.clientWidth);
      if (overflow <= 8) {
        return;
      }

      const gap = 16;
      const distance = Math.ceil(textNode.scrollWidth + gap);
      const duration = Math.max(4, Math.min(12, distance / 40));
      trigger.classList.add('is-marquee');
      trigger.style.setProperty('--artist-bio-marquee-distance', `${distance}px`);
      trigger.style.setProperty('--artist-bio-marquee-duration', `${duration}s`);
      trigger.style.setProperty('--artist-bio-marquee-gap', `${gap}px`);
    });
  },

  async createFavoriteControl(track, hasAudioPreviewAvailable = true) {
    const container = document.createElement('div');
    container.className = 'd-flex align-items-center';

    if (!hasAudioPreviewAvailable) return container;
    if (!this.isAuthenticated) return container;
    if (typeof window.createFavoriteButtonWithCheck !== 'function') return container;
    if (!track?.name || !track?.artist) return container;

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
          icon.style.fontSize = isActive ? '1.0rem' : '1.2rem';
          icon.style.lineHeight = '1';
        }

        favoriteButton.style.background = isActive ? '#dc3545' : 'transparent';
        favoriteButton.style.border = 'none';
        favoriteButton.style.color = isActive ? '#fff' : 'rgba(220, 53, 69, 0.72)';
        favoriteButton.style.borderRadius = '50%';
        favoriteButton.style.width = '31px';
        favoriteButton.style.height = '31px';
        favoriteButton.style.padding = '0';
        favoriteButton.style.paddingTop = '3px';
        favoriteButton.style.display = 'inline-flex';
        favoriteButton.style.alignItems = 'center';
        favoriteButton.style.justifyContent = 'center';
        favoriteButton.style.boxShadow = 'none';
      };

      favoriteButton.className = 'favorite-icon-btn';
      favoriteButton.style.minWidth = '31px';
      favoriteButton.style.flexShrink = '0';
      favoriteButton.style.transition = 'background-color 0.2s ease, color 0.2s ease';

      syncFavoriteVisualState();

      const styleSyncObserver = new MutationObserver(() => {
        syncFavoriteVisualState();
      });
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
      console.error('Year2025 favorite button init error:', error);
    }

    return container;
  },

  async render(list) {
    const currentRenderVersion = ++this.renderVersion;
    const container = document.getElementById('year2025-container');
    if (!list.length) {
      Utils.renderEmpty('year2025-container');
      return;
    }

    container.replaceChildren();

    const fragment = document.createDocumentFragment();

    for (const t of list) {
      if (currentRenderVersion !== this.renderVersion) return;
      const col = document.createElement('div');
      col.className = 'col';

      const cover =
        t.image_url && t.image_url !== '/static/images/default.svg'
          ? t.image_url
          : '/static/images/default.svg';

      const card = document.createElement('div');
      card.className = 'card h-100 rounded-sm card-year year-track-card';

      const img = document.createElement('img');
      img.src = cover;
      img.alt = t.name;
      img.loading = 'lazy';
      img.className = 'card-img-top shadow year-track-image';
      img.onerror = () => {
        img.src = '/static/images/default.svg';
      };

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body p-2 year-track-body';

      const metaWrap = document.createElement('div');
      metaWrap.className = 'year-track-meta';

      const title = document.createElement('h6');
      title.className = 'card-title mb-1 year-track-title flex-grow-1';
      title.setAttribute('title', t.name);

      const titleTrack = document.createElement('span');
      titleTrack.className = 'year-track-title-track';

      const titleText = document.createElement('span');
      titleText.className = 'year-track-title-text';
      titleText.textContent = t.name;

      const titleTextClone = document.createElement('span');
      titleTextClone.className = 'year-track-title-text year-track-title-text-clone';
      titleTextClone.textContent = t.name;
      titleTextClone.setAttribute('aria-hidden', 'true');

      titleTrack.append(titleText, titleTextClone);
      title.appendChild(titleTrack);

      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        new bootstrap.Tooltip(title);
      }

      const hasAudio = hasAudioPreview(t.url);
      if (!hasAudio) continue;

      const favoriteControl = await this.createFavoriteControl(t, hasAudio);
      if (currentRenderVersion !== this.renderVersion) return;

      const titleRow = document.createElement('div');
      titleRow.className = 'd-flex align-items-start justify-content-between gap-2 mb-1';
      titleRow.append(title, favoriteControl);

      const artistName = t.artist || 'Unknown artist';
      const artistP = document.createElement('p');
      artistP.className = 'card-text small mb-1 year-track-artist';
      artistP.style.borderLeft = '3px solid rgba(255, 13, 0, 0.73)';
      artistP.style.borderRadius = '3px';
      artistP.style.paddingLeft = '4px';
      const artistLabel = document.createElement('span');
      artistLabel.textContent = 'Артист: ';

      const artistButton = document.createElement('button');
      artistButton.type = 'button';
      artistButton.className = 'artist-bio-trigger js-artist-bio-trigger color-dark fw-medium';
      artistButton.dataset.artistName = artistName;
      artistButton.setAttribute('data-bs-toggle', 'tooltip');
      artistButton.setAttribute('data-bs-placement', 'top');
      artistButton.setAttribute('data-bs-title', artistName);

      const artistTrack = document.createElement('span');
      artistTrack.className = 'artist-bio-trigger-track';

      const artistText = document.createElement('span');
      artistText.className = 'artist-bio-trigger-text';
      artistText.textContent = artistName;

      const artistTextClone = document.createElement('span');
      artistTextClone.className = 'artist-bio-trigger-text artist-bio-trigger-text-clone';
      artistTextClone.textContent = artistName;
      artistTextClone.setAttribute('aria-hidden', 'true');

      artistTrack.append(artistText, artistTextClone);
      artistButton.appendChild(artistTrack);
      artistP.append(artistLabel, artistButton);
      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        new bootstrap.Tooltip(artistButton);
      }

      const listenersP = document.createElement('p');
      listenersP.className = 'card-text small text-muted mb-2 year-track-listeners';

      const count = resolveTrackPlaycount(t);
      listenersP.textContent = `Прослушиваний: ${count}`;

      metaWrap.appendChild(titleRow);
      metaWrap.appendChild(artistP);
      metaWrap.appendChild(listenersP);
      cardBody.appendChild(metaWrap);

      const previewMount = document.createElement('div');
      previewMount.className = 'audio-preview-mount year-track-audio';
      previewMount.dataset.audioPreviewUrl = t.url;
      cardBody.appendChild(previewMount);

      card.appendChild(img);
      card.appendChild(cardBody);
      col.appendChild(card);
      fragment.appendChild(col);
    }

    container.appendChild(fragment);

    if (typeof Utils !== 'undefined' && typeof Utils.initAudioPreviews === 'function') {
      Utils.initAudioPreviews(container);
    }
    this.syncTitleMarquee(container);
    this.syncArtistBioMarquee(container);
    window.setTimeout(() => this.syncTitleMarquee(container), 120);
    window.setTimeout(() => this.syncArtistBioMarquee(container), 120);

    document.dispatchEvent(new Event('year2025:rendered'));
  },

  initAudioControls() {},

  async load(genre = '') {
    const isGenre = Boolean(genre);
    const cacheKey = genre || 'all';
    const cached = Utils.getCached(this.cache, cacheKey);
    if (cached) {
      await this.render(cached);
      return;
    }

    Utils.showYearSpinner(true);
    try {
      const url = isGenre
        ? buildYearChartUrl('/music_api/year-chart/', genre)
        : buildYearChartUrl(this.URL);
      const data = await Utils.fetchData(url);
      const tracks = extractYearTracks(data);
      tracks.sort((a, b) => resolveTrackPlaycount(b) - resolveTrackPlaycount(a));

      if (!tracks.length) {
        console.warn('Нет данных для жанра:', genre || 'все');
        Utils.setCache(this.cache, cacheKey, tracks);
        await this.render(tracks);
        return;
      }

      Utils.setCache(this.cache, cacheKey, tracks);
      await this.render(tracks);
    } catch (e) {
      console.error('Ошибка загрузки чарта:', e);
      const errorMessage = e.message || 'Не удалось загрузить данные';
      Utils.showError('year2025-container', errorMessage);

      await this.render([]);
    } finally {
      Utils.showYearSpinner(false);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Year2025App.init());

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Year2025App,
    buildYearChartUrl,
    extractYearTracks,
    hasAudioPreview,
    resolveTrackPlaycount,
  };
}
