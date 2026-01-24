const YEAR_URL = '/music_api/year-chart/';
const CACHE_KEY = 'year2025_tracks';
const CACHE_TTL = 15 * 60 * 1000;

function getCached() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts > CACHE_TTL ? null : data;
  } catch {
    return null;
  }
}
function setCached(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
}

function showSpinner(show = true) {
  let sp = document.getElementById('year2025-spinner');
  if (!sp) {
    sp = document.createElement('div');
    sp.id = 'year2025-spinner';
    sp.className = 'search-loading';
    sp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> loading...';
    document.getElementById('year2025-container').before(sp);
  }
  sp.style.display = show ? 'block' : 'none';
}

async function loadYear2025() {
  const cached = getCached();
  if (cached) {
    renderTracks2025(cached);
    return;
  }

  showSpinner(true);
  try {
    const res = await fetch(YEAR_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    setCached(data.tracks);
    renderTracks2025(data.tracks);
  } catch (e) {
    console.error(e);
    document.getElementById('year2025-container').innerHTML =
      '<div class="col-12 text-start text-danger">Не удалось загрузить данные.</div>';
  } finally {
    showSpinner(false);
  }
}

function renderTracks2025(list) {
  const container = document.getElementById('year2025-container');
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="col-12 text-center text-muted">Нет данных.</div>';
    return;
  }

  list.forEach(t => {
    const col = document.createElement('div');
    col.className = 'col';

    const cover = (t.image_url && t.image_url !== '/static/images/default.svg')
                ? t.image_url
                : '/static/images/default.svg';

    const hasAudio = t.url && /\.(mp3|m4a)(\?.*)?$/i.test(t.url);
    const audioBlock = hasAudio
      ? `<audio controls preload="none" style="width:100%; filter: sepia(1) saturate(2) hue-rotate(320deg);">
           <source src="${t.url}">
           Ваш браузер не поддерживает аудио.
         </audio>`
      : `<div class="small text-muted">Превью недоступно</div>`;

    col.innerHTML = `
      <div class="card h-100 shadow-sm rounded-sm card-year">
        <img src="${cover}" class="card-img-top" alt="${t.name}" onerror="this.src='/static/images/default.svg'">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">${t.name}</h6>
          <p class="card-text small mb-1">Артист: ${t.artist}</p>
          <p class="card-text small text-muted mb-2">
            Прослушиваний: ${t.listeners.toLocaleString('ru-RU')}
          </p>
          ${audioBlock}
        </div>
      </div>`;
    container.appendChild(col);
  });

  document.dispatchEvent(new Event('year2025:rendered'));
}

document.addEventListener('DOMContentLoaded', loadYear2025);