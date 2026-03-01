const Year2025App = {
  URL: '/music_api/year-chart/',
  cache: {},
  activeAudio: null,
  audioControlsInitialized: false,
  renderVersion: 0,
  isAuthenticated: false,

  init() {
    this.isAuthenticated = document.body?.dataset?.isAuthenticated === 'true';
    Utils.initGenreButtons('year-genre-container', (genre) => this.load(genre), true);
    this.initAudioControls();
    this.load();
  },

  async createFavoriteControl(track) {
    const container = document.createElement('div');
    container.className = 'd-flex align-items-center';

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
        subtree: true
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

      const cover = t.image_url && t.image_url !== '/static/images/default.svg'
        ? t.image_url
        : '/static/images/default.svg';

      const card = document.createElement('div');
      card.className = 'card h-100 rounded-sm card-year year-track-card';

      const img = document.createElement('img');
      img.src = cover;
      img.alt = t.name;
      img.loading = 'lazy';
      img.className = 'card-img-top shadow year-track-image';
      img.onerror = () => { img.src = '/static/images/default.svg'; };

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body p-2 year-track-body';

      const metaWrap = document.createElement('div');
      metaWrap.className = 'year-track-meta';

      const title = document.createElement('h6');
      title.className = 'card-title mb-1 text-truncate year-track-title flex-grow-1';
      title.textContent = t.name;
      title.style.whiteSpace = 'nowrap';
      title.style.overflow = 'hidden';
      title.style.textOverflow = 'ellipsis';
      title.style.cursor = 'pointer';
      title.setAttribute('title', t.name);

      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        new bootstrap.Tooltip(title);
      }

      const favoriteControl = await this.createFavoriteControl(t);
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
      artistButton.textContent = artistName;
      artistP.append(artistLabel, artistButton);

      const listenersP = document.createElement('p');
      listenersP.className = 'card-text small text-muted mb-2 year-track-listeners';

      const count = t.playcount || t.listeners || 0;
      listenersP.textContent = `Прослушиваний: ${count}`;

      metaWrap.appendChild(titleRow);
      metaWrap.appendChild(artistP);
      metaWrap.appendChild(listenersP);
      cardBody.appendChild(metaWrap);

      const hasAudio = t.url && /\.(mp3|m4a)(\?.*)?$/i.test(t.url);
      if (hasAudio) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'none';
        audio.className = 'year-track-audio';
        audio.style.cssText = 'width:100%; filter: sepia(1) saturate(2) hue-rotate(320deg);';

        const source = document.createElement('source');
        source.src = t.url;
        audio.appendChild(source);

        cardBody.appendChild(audio);
      } else {
        const noPreview = document.createElement('div');
        noPreview.className = 'fs-6 text-body d-inline-block border-bottom border-danger year-track-no-preview';
        noPreview.textContent = 'Превью недоступно';
        cardBody.appendChild(noPreview);
      }

      card.appendChild(img);
      card.appendChild(cardBody);
      col.appendChild(card);
      fragment.appendChild(col);
    }

    container.appendChild(fragment);

    document.dispatchEvent(new Event('year2025:rendered'));
  },

  initAudioControls() {
    const container = document.getElementById('year2025-container');
    if (!container || this.audioControlsInitialized) return;
    this.audioControlsInitialized = true;

    container.addEventListener('play', (event) => {
      const audio = event.target;
      if (audio.tagName !== 'AUDIO') return;
      if (this.activeAudio && this.activeAudio !== audio) {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      }
      this.activeAudio = audio;
    }, true);
    container.addEventListener('ended', (event) => {
      const audio = event.target;
      if (audio.tagName !== 'AUDIO') return;
      if (this.activeAudio === audio) this.activeAudio = null;
    }, true);
  },

  async load(genre = '') {
    const cached = Utils.getCached(this.cache, genre);
    if (cached) {
      await this.render(cached);
      return;
    }

    Utils.showYearSpinner(true);
    try {
      const url = genre ? `${this.URL}?genre=${encodeURIComponent(genre)}` : this.URL;
      const data = await Utils.fetchData(url);

      if (!data || typeof data !== 'object') {
        throw new Error('Неверный формат ответа сервера');
      }

      const tracks = data.tracks || [];

      if (!tracks.length) {
        console.warn('Нет данных для жанра:', genre || 'все');
        Utils.setCache(this.cache, genre, tracks);
        await this.render(tracks);
        return;
      }

      Utils.setCache(this.cache, genre, tracks);
      await this.render(tracks);
    } catch (e) {
      console.error('Ошибка загрузки чарта:', e);
      const errorMessage = e.message || 'Не удалось загрузить данные';
      Utils.showError('year2025-container', errorMessage);

      await this.render([]);
    } finally {
      Utils.showYearSpinner(false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Year2025App.init());
