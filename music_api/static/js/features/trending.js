const TrendingApp = {
  URL: '/music_api/trending/',
  cache: {},

  init() {
    Utils.initGenreButtons('trending-genre-container', (genre) => this.load(genre));
    this.load();
  },

  render(list) {
    const container = document.getElementById('trending-container');
    if (!list.length) {
      Utils.renderEmpty('trending-container');
      return;
    }

    container.innerHTML = '';
    list.forEach(a => {
      const col = document.createElement('div');
      col.className = 'col';
      col.innerHTML = `
        <div class="card h-100 shadow-sm rounded-sm card-custom">
          <div class="row g-0 h-100">
            <div class="col-md-4">
              <img src="${a.photo_url}" class="img-fluid rounded-start h-100 w-100 object-fit-cover" alt="${a.name}" loading="lazy">
            </div>
            <div class="col-md-8 d-flex flex-column">
              <div class="card-body">
                <h5 class="card-title mb-1">${a.name}</h5>
              </div>
              <div class="card-footer mt-auto">
                <small class="text-muted">Популярные альбомы:</small>
                <ul class="list-unstyled mb-0 mt-1">
                  ${a.releases.map(r => `
                    <li class="d-flex align-items-center mb-1">
                      <img src="${r.cover}" width="32" height="32" class="rounded me-2 shadow-sm" loading="lazy">
                      <div>
                        <div class="fw-semibold">${r.title}</div>
                        <div class="small text-muted">Прослушиваний:&nbsp;${r.playcount}</div>
                      </div>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(col);
    });

    document.dispatchEvent(new Event('trending:rendered'));
  },

  async load(genre = '') {
    const cached = Utils.getCached(this.cache, genre);
    if (cached) {
      this.render(cached);
      return;
    }

    Utils.showSpinner('trending-spinner', 'trending-container', true);
    try {
      const url = genre ? `${this.URL}?genre=${encodeURIComponent(genre)}` : this.URL;
      const data = await Utils.fetchData(url);

      Utils.setCache(this.cache, genre, data.artists);
      this.render(data.artists);
    } catch (e) {
      console.error(e);
      Utils.showError('trending-container');
    } finally {
      Utils.showSpinner('trending-spinner', 'trending-container', false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => TrendingApp.init());