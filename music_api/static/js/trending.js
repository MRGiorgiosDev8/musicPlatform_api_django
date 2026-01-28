const TRENDING_URL = '/music_api/trending/';
const CACHE_TTL = 10 * 60 * 1000;

let trendingGenreCache = {};

const TRENDING_GENRES = [
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
];

function showSpinner(show = true) {
  let sp = document.getElementById('trending-spinner');
  if (!sp) {
    sp = document.createElement('div');
    sp.id = 'trending-spinner';
    sp.className = 'search-loading';
    sp.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> <span style="font-weight:300;">загрузка данных ...</span>';
    document.getElementById('trending-container').before(sp);
  }
  sp.style.display = show ? 'block' : 'none';
}

function initTrendingGenreButtons() {
  const container = document.getElementById('trending-genre-container');
  if (!container) return;

  container.innerHTML = '';

  TRENDING_GENRES.forEach((g, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-danger flex-shrink-0 genre-btn';
    if (idx === 0) btn.classList.add('active');
    btn.dataset.genre = g.value;
    btn.style.minWidth = '120px';

    btn.innerHTML = `
      <img src="/static/images/default.svg" width="24" height="24" class="me-1">
      ${g.label}
    `;

    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTrending(btn.dataset.genre);
    });

    container.appendChild(btn);
  });
}

function renderCards(list) {
  const container = document.getElementById('trending-container');
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML =
      '<div class="col-12 text-center text-muted">Нет данных.</div>';
    return;
  }

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
              <small class="text-muted">Популярные релизы:</small>
              <ul class="list-unstyled mb-0 mt-1">
                ${a.releases.map(r => `
                  <li class="d-flex align-items-center mb-1">
                    <img src="${r.cover}" width="32" height="32" class="rounded me-2 shadow-sm" loading="lazy">
                    <div>
                      <div class="fw-semibold">${r.title}</div>
                      <div class="small text-muted">${r.playcount} прослушиваний</div>
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
}

async function loadTrending(genre = '') {
  const cached = trendingGenreCache[genre];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    renderCards(cached.data);
    return;
  }

  showSpinner(true);
  try {
    const url = genre
      ? `${TRENDING_URL}?genre=${encodeURIComponent(genre)}`
      : TRENDING_URL;

    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    trendingGenreCache[genre] = { ts: Date.now(), data: data.artists };

    renderCards(data.artists);
  } catch (e) {
    console.error(e);
    document.getElementById('trending-container').innerHTML =
      '<div class="col-12 text-start text-danger">Не удалось загрузить данные.</div>';
  } finally {
    showSpinner(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTrendingGenreButtons();
  loadTrending();
});