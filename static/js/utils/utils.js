const Utils = {
  CACHE_TTL: 10 * 60 * 1000,

  GENRES: [
    { value: '', label: 'Все' },
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' },
    { value: 'hip-hop', label: 'Hip-Hop' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'rap', label: 'Rap' },
    { value: 'soul', label: 'Soul' },
    { value: 'indie', label: 'Indie' },
    { value: 'r&b', label: 'R&B' },
    { value: 'k-pop', label: 'K-Pop' },
    { value: 'lo-fi', label: 'Lo-Fi' },
    { value: 'house', label: 'House' },
    { value: 'dubstep', label: 'Dubstep' },
    { value: 'trap', label: 'Trap' },
    { value: 'blues', label: 'Blues' },
    { value: 'metal', label: 'Metal' },
    { value: 'country', label: 'Country' },
    { value: 'punk', label: 'Punk' },
    { value: 'classical', label: 'Classical' },
    { value: 'grunge', label: 'Grunge' },
    { value: 'alternative', label: 'Alternative' },
    { value: 'phonk', label: 'Phonk' },
    { value: 'edm', label: 'EDM' },
    { value: 'folk', label: 'Folk' },
    { value: 'hyperpop', label: 'Hyperpop' },
  ],

  showTrendingSpinner(show = true) {
    if (window.Spinners && window.Spinners.trending) {
      if (show) {
        window.Spinners.trending.show();
      } else {
        window.Spinners.trending.hide();
      }
    }
  },

  showYearSpinner(show = true) {
    if (window.Spinners && window.Spinners.year) {
      if (show) {
        window.Spinners.year.show();
      } else {
        window.Spinners.year.hide();
      }
    }
  },

  initGenreButtons(containerId, onSelect, addCarouselClass = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.replaceChildren();
    if (addCarouselClass) container.classList.add('genre-carousel');

    const fragment = document.createDocumentFragment();

    this.GENRES.forEach((g, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-danger flex-shrink-0 genre-btn';
      btn.dataset.genre = g.value;
      btn.style.minWidth = '120px';

      if (idx === 0) btn.classList.add('active');

      const fill = document.createElement('span');
      fill.className = 'btn-fill';
      btn.appendChild(fill);

      const reveal = document.createElement('div');
      reveal.className = 'genre-btn-reveal';
      reveal.setAttribute('aria-hidden', 'true');
      btn.insertBefore(reveal, btn.firstChild);

      const img = document.createElement('img');
      img.src = '/static/images/default.svg';
      img.width = 24;
      img.height = 24;
      img.className = 'me-1';
      img.alt = '';

      const label = document.createElement('span');
      label.className = 'genre-btn-label';
      label.textContent = g.label;

      btn.append(img, label);
      fragment.appendChild(btn);

      if (typeof animateGenreBtn === 'function') animateGenreBtn(btn, idx);
    });

    container.appendChild(fragment);

    setTimeout(() => {
      const firstActiveBtn = container.querySelector('.genre-btn.active');
      if (firstActiveBtn && typeof showActiveReveal === 'function') {
        showActiveReveal(firstActiveBtn);
      }
    }, 100);

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.genre-btn');
      if (!btn || !container.contains(btn)) return;

      const allBtns = container.querySelectorAll('.genre-btn');

      allBtns.forEach((b) => {
        if (b !== btn) {
          b.classList.remove('active');
          const f = b.querySelector('.btn-fill');
          if (f && typeof gsap !== 'undefined')
            gsap.set(f, { height: '0%', borderRadius: '50% 50% 0 0' });
          const rev = b.querySelector('.genre-btn-reveal');
          if (rev && typeof gsap !== 'undefined') gsap.set(rev, { scale: 0 });

          if (typeof hideActiveReveal === 'function') hideActiveReveal(b);
        }
      });

      btn.classList.add('active');

      if (typeof showActiveReveal === 'function') showActiveReveal(btn);

      onSelect(btn.dataset.genre);
    });
  },

  getCached(cacheObj, key) {
    const cached = cacheObj[key];
    return cached && Date.now() - cached.ts < this.CACHE_TTL ? cached.data : null;
  },

  setCache(cacheObj, key, data) {
    cacheObj[key] = { ts: Date.now(), data };
  },

  renderEmpty(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'text-center mx-auto';
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger mt-4 alert-log d-inline-block';
    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-triangle me-2';
    alert.append(icon, document.createTextNode('Нет данных'));
    wrapper.appendChild(alert);
    container.appendChild(wrapper);
  },

  showError(containerId, message = 'Не удалось загрузить данные') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.alert-log').forEach((el) => el.remove());
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger mt-4 alert-log';
    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-triangle';
    alert.append(icon, document.createTextNode(` ${message}`));
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 30000);
  },

  async fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return res.json();
  },

  hasAudioPreview(url) {
    return Boolean(url && /\.(mp3|m4a)(\?.*)?$/i.test(url));
  },

  getNoPreviewBadgeClasses(extraClasses = '') {
    const base =
      'fs-6 text-body d-inline-block border-bottom border-danger bg-danger rounded bg-opacity-10 p-1 border border-white';
    return extraClasses ? `${base} ${extraClasses}` : base;
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  initAudioPreviews(root = document) {
    const mounts = root.querySelectorAll('[data-audio-preview-url]');
    if (!mounts.length) return;

    mounts.forEach((mount) => {
      if (mount.dataset.audioPreviewInitialized === 'true') return;
      const url = mount.dataset.audioPreviewUrl;
      if (!url) return;

      mount.dataset.audioPreviewInitialized = 'true';

      if (typeof window.WaveSurfer === 'undefined') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'none';
        audio.src = url;
        audio.className = 'audio-preview-fallback';
        mount.replaceChildren(audio);
        return;
      }

      this._createWaveSurferPlayer(mount, url);
    });
  },

  _createWaveSurferPlayer(mount, url) {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-preview-player';

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'audio-preview-toggle';
    playButton.setAttribute('aria-label', 'Воспроизвести превью');

    const iconWrap = document.createElement('span');
    iconWrap.className = 'audio-preview-icon';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('audio-preview-svg');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const playPath = 'M6 4 L18 12 L6 20 Z';
    const pausePath = 'M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z';
    path.setAttribute('d', playPath);
    path.dataset.playPath = playPath;
    path.dataset.pausePath = pausePath;

    svg.appendChild(path);
    iconWrap.appendChild(svg);
    playButton.appendChild(iconWrap);

    const wave = document.createElement('div');
    wave.className = 'audio-preview-wave';

    const time = document.createElement('span');
    time.className = 'audio-preview-time';
    time.textContent = '0:00';

    wrapper.append(playButton, wave, time);
    mount.replaceChildren(wrapper);

    const ws = window.WaveSurfer.create({
      container: wave,
      waveColor: '#d33f3f',
      progressColor: '#a51212',
      cursorColor: 'transparent',
      height: 42,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      responsive: true,
      normalize: true,
    });

    if (!this._audioPreviewInstances) this._audioPreviewInstances = new Set();
    this._audioPreviewInstances.add(ws);

    const updateButtonState = (isPlaying) => {
      playButton.setAttribute(
        'aria-label',
        isPlaying ? 'Поставить превью на паузу' : 'Воспроизвести превью'
      );
      playButton.classList.toggle('is-playing', isPlaying);
    };

    ws.on('ready', () => {
      time.textContent = `0:00 / ${this.formatTime(ws.getDuration())}`;
    });

    ws.on('audioprocess', () => {
      if (!ws.isPlaying()) return;
      time.textContent = `${this.formatTime(ws.getCurrentTime())} / ${this.formatTime(
        ws.getDuration()
      )}`;
    });

    ws.on('play', () => {
      this._audioPreviewInstances.forEach((instance) => {
        if (instance !== ws) instance.pause();
      });
      updateButtonState(true);
    });

    ws.on('pause', () => {
      updateButtonState(false);
    });

    ws.on('finish', () => {
      updateButtonState(false);
      ws.seekTo(0);
    });

    ws.on('error', () => {
      mount.dataset.audioPreviewInitialized = 'false';
      mount.replaceChildren();
    });

    playButton.addEventListener('click', () => {
      if (ws.isPlaying()) {
        ws.pause();
      } else {
        ws.play();
      }
    });

    ws.load(url);
  },

  createChevronDownIcon(fontSize = '1.8rem') {
    const arrowIcon = document.createElement('i');
    arrowIcon.className = 'bi bi-chevron-double-down';
    arrowIcon.setAttribute('aria-hidden', 'true');
    arrowIcon.style.fontSize = fontSize;
    arrowIcon.style.lineHeight = '1';
    arrowIcon.style.color = 'var(--color-primary)';
    return arrowIcon;
  },

  createShowMoreButton(marginTop = 'mt-2') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm btn-show-more ${marginTop}`;
    button.style.transform = 'scale(1.1)';
    button.style.transition = 'transform 0.3s ease';
    button.style.backgroundColor = 'transparent';
    button.style.border = 'none';
    button.style.outline = 'none';
    button.style.opacity = '0.90';

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(0.95)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1.1)';
    });

    return button;
  },

  closeParentOffcanvas(element) {
    if (!element?.closest) return;
    const offcanvasEl = element.closest('.offcanvas');
    if (!offcanvasEl || !offcanvasEl.classList.contains('show')) return;
    if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
      const instance = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
      instance.hide();
    } else {
      offcanvasEl.classList.remove('show');
      offcanvasEl.setAttribute('aria-hidden', 'true');
    }
  },

  syncInfiniteMarquee({
    container = document,
    targetSelector = '',
    trackSelector = '',
    textSelector = '',
    activeClass = 'is-marquee',
    distanceVar = '--marquee-distance',
    durationVar = '--marquee-duration',
    gapVar = '--marquee-gap',
    gap = 16,
    overflowThreshold = 8,
    minDuration = 4,
    maxDuration = 12,
    speed = 40,
  } = {}) {
    if (!container || !targetSelector || !trackSelector || !textSelector) return;

    const targets = container.querySelectorAll(targetSelector);
    targets.forEach((target) => {
      const trackNode = target.querySelector(trackSelector);
      const textNode = target.querySelector(textSelector);
      if (!trackNode || !textNode) return;

      target.classList.remove(activeClass);
      target.style.removeProperty(distanceVar);
      target.style.removeProperty(durationVar);
      target.style.removeProperty(gapVar);

      if (target.clientWidth <= 0) return;

      const overflow = Math.ceil(textNode.scrollWidth - target.clientWidth);
      if (overflow <= overflowThreshold) return;

      const marqueeGap = Math.max(0, Number(gap) || 0);
      const distance = Math.ceil(textNode.scrollWidth + marqueeGap);
      const pxPerSecond = Math.max(1, Number(speed) || 40);
      const duration = Math.max(
        Number(minDuration) || 0,
        Math.min(Number(maxDuration) || 999, distance / pxPerSecond)
      );

      target.classList.add(activeClass);
      target.style.setProperty(distanceVar, `${distance}px`);
      target.style.setProperty(durationVar, `${duration}s`);
      target.style.setProperty(gapVar, `${marqueeGap}px`);
    });
  },
};
