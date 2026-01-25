const TRENDING_URL = '/music_api/trending/';
const CACHE_KEY   = 'trending_artists';
const CACHE_TTL   = 10 * 60 * 1000;

function getCached() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const {ts, data} = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}
function setCached(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ts: Date.now(), data}));
}

function renderCards(list) {
  const container = document.getElementById('trending-container');
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="col-12 text-center text-muted">Нет данных.</div>';
    return;
  }

  list.forEach(a => {
    const card = document.createElement('div');
    card.className = 'col';
    card.innerHTML = `
      <div class="card h-100 shadow-sm rounded-sm card-custom">
        <div class="row g-0 h-100">
          <div class="col-md-4">
            <img src="${a.photo_url}" class="img-fluid rounded-start h-100 w-100 object-fit-cover" alt="${a.name}" loading="lazy">
          </div>
          <div class="col-md-8 d-flex flex-column">
            <div class="card-body"><h5 class="card-title mb-1">${a.name}</h5></div>
            <div class="card-footer mt-auto">
              <small class="text-muted">Популярные релизы:</small>
              <ul class="list-unstyled mb-0 mt-1">
                ${a.releases.map(r => `
                  <li class="d-flex align-items-center mb-1">
                    <img src="${r.cover}" width="32" height="32" class="rounded me-2 shadow-sm" alt="cover" loading="lazy">
                    <div><div class="fw-semibold">${r.title}</div>
                         <div class="small text-muted">${r.playcount} прослушиваний</div></div>
                  </li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
  });

  document.dispatchEvent(new Event('trending:rendered'));
}

function showSpinner(show = true) {
  let spinner = document.getElementById('trending-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'trending-spinner';
    spinner.className = 'search-loading';
    spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span style="font-weight: 300;">загрузка данных ...</span>';
    document.getElementById('trending-container').before(spinner);
  }
  spinner.style.display = show ? 'block' : 'none';
}

/* ---------- загрузка ---------- */
async function loadTrending() {
  const cached = getCached();
  if (cached) {
    renderCards(cached);
    return;
  }

  showSpinner(true);
  try {
    const res = await fetch(TRENDING_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    setCached(data.artists);
    renderCards(data.artists);
  } catch (e) {
    console.error(e);
    document.getElementById('trending-container').innerHTML =
      '<div class="col-12 text-start text-danger">Не удалось загрузить данные.</div>';
  } finally {
    showSpinner(false);
  }
}

document.addEventListener('DOMContentLoaded', loadTrending);