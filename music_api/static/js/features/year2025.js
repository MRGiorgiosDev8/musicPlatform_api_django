const Year2025App = {
  URL: '/music_api/year-chart/',
  cache: {},
  activeAudio: null,

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

    container.replaceChildren();

    const fragment = document.createDocumentFragment();

    list.forEach(t => {
      const col = document.createElement('div');
      col.className = 'col';

      const cover = t.image_url && t.image_url !== '/static/images/default.svg'
        ? t.image_url
        : '/static/images/default.svg';

      const card = document.createElement('div');
      card.className = 'card h-100 shadow-sm rounded-sm card-year';

      const img = document.createElement('img');
      img.src = cover;
      img.alt = t.name;
      img.loading = 'lazy';
      img.className = 'card-img-top';
      img.onerror = () => { img.src = '/static/images/default.svg'; };

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body p-2';

      const title = document.createElement('h6');
      title.className = 'card-title mb-1';
      title.textContent = t.name;

      const artistP = document.createElement('p');
      artistP.className = 'card-text small mb-1';
      artistP.innerHTML = 'Артист: <span class="text-secondary fw-medium"></span>';
      artistP.querySelector('span').textContent = t.artist;

      const listenersP = document.createElement('p');
      listenersP.className = 'card-text small text-muted mb-2';
      listenersP.textContent = `Прослушиваний: ${t.listeners}`;

      cardBody.appendChild(title);
      cardBody.appendChild(artistP);
      cardBody.appendChild(listenersP);

      const hasAudio = t.url && /\.(mp3|m4a)(\?.*)?$/i.test(t.url);
      if (hasAudio) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'none';
        audio.style.cssText = 'width:100%; filter: sepia(1) saturate(2) hue-rotate(320deg);';

        const source = document.createElement('source');
        source.src = t.url;
        audio.appendChild(source);

        cardBody.appendChild(audio);
      } else {
        const noPreview = document.createElement('div');
        noPreview.className = 'fs-6 text-body d-inline-block border-bottom border-danger';
        noPreview.textContent = 'Превью недоступно';
        cardBody.appendChild(noPreview);
      }

      card.appendChild(img);
      card.appendChild(cardBody);
      col.appendChild(card);
      fragment.appendChild(col);
    });

    container.appendChild(fragment);

    this.initAudioControls();
    document.dispatchEvent(new Event('year2025:rendered'));
  },

  initAudioControls() {
    const container = document.getElementById('year2025-container');
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
      this.render(cached);
      return;
    }

    Utils.showYearSpinner(true);
    try {
      const url = genre ? `${this.URL}?genre=${encodeURIComponent(genre)}` : this.URL;
      const data = await Utils.fetchData(url);

      Utils.setCache(this.cache, genre, data.tracks);
      this.render(data.tracks);
    } catch (e) {
      console.error(e);
      Utils.showError('year2025-container');
    } finally {
      Utils.showYearSpinner(false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Year2025App.init());