const Year2025App = {
  URL: '/music_api/year-chart/',
  cache: {},
  activeAudio: null, // Уникальная переменная для этого модуля

  init() {
    Utils.initGenreButtons('year-genre-container', (genre) => this.load(genre), true);
    this.load();
  },

  render(list) {
    const container = document.getElementById('year2025-container');
    if (!list.length) {
      Utils.renderEmpty('year2025-container');
      return;
    }

    container.innerHTML = '';
    list.forEach(t => {
      const col = document.createElement('div');
      col.className = 'col';

      const cover = t.image_url && t.image_url !== '/static/images/default.svg'
        ? t.image_url
        : '/static/images/default.svg';

      const hasAudio = t.url && /\.(mp3|m4a)(\?.*)?$/i.test(t.url);
      const audioBlock = hasAudio
        ? `<audio controls preload="none" style="width:100%; filter: sepia(1) saturate(2) hue-rotate(320deg);">
             <source src="${t.url}">
             Ваш браузер не поддерживает аудио.
           </audio>`
        : `<div class="fs-6 text-muted d-inline-block border-bottom border-danger">Превью недоступно</div>`;

      col.innerHTML = `
        <div class="card h-100 shadow-sm rounded-sm card-year">
          <img src="${cover}" class="card-img-top"
               alt="${t.name}"
               onerror="this.src='/static/images/default.svg'"
               loading="lazy">
          <div class="card-body p-2">
            <h6 class="card-title mb-1">${t.name}</h6>
            <p class="card-text small mb-1">Артист: ${t.artist}</p>
            <p class="card-text small text-muted mb-2">Прослушиваний: ${t.listeners}</p>
            ${audioBlock}
          </div>
        </div>
      `;
      container.appendChild(col);
    });

    // Уникальная логика аудио только для этого модуля
    this.initAudioControls();
    document.dispatchEvent(new Event('year2025:rendered'));
  },

  initAudioControls() {
    const container = document.getElementById('year2025-container');
    container.querySelectorAll('audio').forEach(audio => {
      audio.addEventListener('play', () => {
        if (this.activeAudio && this.activeAudio !== audio) {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
        }
        this.activeAudio = audio;
      });
      audio.addEventListener('ended', () => {
        if (this.activeAudio === audio) this.activeAudio = null;
      });
    });
  },

  async load(genre = '') {
    const cached = Utils.getCached(this.cache, genre);
    if (cached) {
      this.render(cached);
      return;
    }

    Utils.showSpinner('year2025-spinner', 'year2025-container', true);
    try {
      const url = genre ? `${this.URL}?genre=${encodeURIComponent(genre)}` : this.URL;
      const data = await Utils.fetchData(url);

      Utils.setCache(this.cache, genre, data.tracks);
      this.render(data.tracks);
    } catch (e) {
      console.error(e);
      Utils.showError('year2025-container');
    } finally {
      Utils.showSpinner('year2025-spinner', 'year2025-container', false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Year2025App.init());