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
    const spinner = document.getElementById('trending-spinner');
    if (!spinner) return;
    spinner.hidden = !show;
  },

  showYearSpinner(show = true) {
    const spinner = document.getElementById('year-spinner');
    if (!spinner) return;
    spinner.hidden = !show;
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

      const img = document.createElement('img');
      img.src = '/static/images/default.svg';
      img.width = 24;
      img.height = 24;
      img.className = 'me-1';
      img.alt = '';

      btn.append(img, document.createTextNode(g.label));
      fragment.appendChild(btn);
      if (typeof animateGenreBtn === 'function') animateGenreBtn(btn, idx);
    });

    container.appendChild(fragment);

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.genre-btn');
      if (!btn || !container.contains(btn)) return;

      container.querySelectorAll('.genre-btn.active')
        .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');
      onSelect(btn.dataset.genre);
    });
  },

  getCached(cacheObj, key) {
    const cached = cacheObj[key];
    return cached && Date.now() - cached.ts < this.CACHE_TTL
      ? cached.data
      : null;
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

    container.querySelectorAll('.alert-log').forEach(el => el.remove());

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
      } catch (e) {

      }
      throw new Error(errorMessage);
    }
    return res.json();
  }
};