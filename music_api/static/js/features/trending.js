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

    container.replaceChildren();

    const fragment = document.createDocumentFragment();

    list.forEach(a => {
      const col = document.createElement('div');
      col.className = 'col';

      const card = document.createElement('div');
      card.className = 'card h-100 shadow-sm rounded-sm card-custom';

      const row = document.createElement('div');
      row.className = 'row g-0 h-100';

      const colImg = document.createElement('div');
      colImg.className = 'col-md-4';

      const img = document.createElement('img');
      img.src = a.photo_url;
      img.className = 'img-fluid rounded-start h-100 w-100 object-fit-cover';
      img.alt = a.name;
      img.loading = 'lazy';

      colImg.appendChild(img);

      const colContent = document.createElement('div');
      colContent.className = 'col-md-8 d-flex flex-column';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';

      const cardTitle = document.createElement('h5');
      cardTitle.className = 'card-title mb-1';
      cardTitle.textContent = a.name;

      cardBody.appendChild(cardTitle);

      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer mt-auto';

      const smallText = document.createElement('small');
      smallText.className = 'text-muted';
      smallText.textContent = 'Популярные альбомы:';

      const ul = document.createElement('ul');
      ul.className = 'list-unstyled mb-0 mt-1';

      a.releases.forEach(r => {
        const li = document.createElement('li');
        li.className = 'd-flex align-items-center mb-1';

        const coverImg = document.createElement('img');
        coverImg.src = r.cover;
        coverImg.width = 32;
        coverImg.height = 32;
        coverImg.className = 'rounded me-2 shadow-sm';
        coverImg.loading = 'lazy';

        const divInfo = document.createElement('div');

        const titleDiv = document.createElement('div');
        titleDiv.className = 'fw-semibold';
        titleDiv.textContent = r.title;

        const playcountDiv = document.createElement('div');
        playcountDiv.className = 'small text-muted';
        playcountDiv.textContent = `Прослушиваний:\u00A0${r.playcount}`;

        divInfo.appendChild(titleDiv);
        divInfo.appendChild(playcountDiv);

        li.appendChild(coverImg);
        li.appendChild(divInfo);

        ul.appendChild(li);
      });

      cardFooter.appendChild(smallText);
      cardFooter.appendChild(ul);

      colContent.appendChild(cardBody);
      colContent.appendChild(cardFooter);

      row.appendChild(colImg);
      row.appendChild(colContent);

      card.appendChild(row);
      col.appendChild(card);

      fragment.appendChild(col);
    });

    container.appendChild(fragment);

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