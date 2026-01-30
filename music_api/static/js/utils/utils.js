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

  showSpinner(spinnerId, containerId, show = true) {
    let sp = document.getElementById(spinnerId);
    if (!sp) {
      sp = document.createElement('div');
      sp.id = spinnerId;
      sp.className = 'search-loading';
      sp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span style="font-weight:300;">загрузка данных ...</span>';
      const container = document.getElementById(containerId);
      if (container) container.before(sp);
    }
    sp.style.display = show ? 'block' : 'none';
  },

  initGenreButtons(containerId, onSelect, addCarouselClass = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    if (addCarouselClass) container.classList.add('genre-carousel');

    this.GENRES.forEach((g, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-danger flex-shrink-0 genre-btn';
      if (idx === 0) btn.classList.add('active');
      btn.dataset.genre = g.value;
      btn.style.minWidth = '120px';
      btn.innerHTML = `<img src="/static/images/default.svg" width="24" height="24" class="me-1">${g.label}`;

      btn.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(g.value);
      });

      container.appendChild(btn);
    });
  },

  getCached(cacheObj, key) {
    const cached = cacheObj[key];
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  },

  setCache(cacheObj, key, data) {
    cacheObj[key] = { ts: Date.now(), data };
  },

  renderEmpty(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger mt-4 alert-log">
          <i class="fas fa-exclamation-triangle"></i> Нет данных.
        </div>`;
    }
  },

  showError(containerId, message = 'Не удалось загрузить данные') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger mt-4 alert-log">
          <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>`;
    }
  },

  async fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }
};