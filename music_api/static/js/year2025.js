const YEAR_URL = '/music_api/year-chart/';
const CACHE_TTL = 10 * 60 * 1000;

let activeAudio = null;
let genreCache = {};

const GENRES = [
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
  let sp = document.getElementById('year2025-spinner');
  if (!sp) {
    sp = document.createElement('div');
    sp.id = 'year2025-spinner';
    sp.className = 'search-loading';
    sp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span style="font-weight:300;">загрузка данных ...</span>';
    document.getElementById('year2025-container').before(sp);
  }
  sp.style.display = show ? 'block' : 'none';
}

function initYearGenreButtons() {
  const container = document.getElementById('year-genre-container');
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('genre-carousel');

  GENRES.forEach((g, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-danger flex-shrink-0';
    if (idx === 0) btn.classList.add('active');
    btn.style.minWidth = '120px';
    btn.style.whiteSpace = 'nowrap';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';

    btn.dataset.genre = g.value;
    btn.innerHTML = `<img src="/static/images/default.svg" width="24" height="24" class="me-1">${g.label}`;

    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadYear2025(g.value);
    });

    container.appendChild(btn);
  });
}

async function loadYear2025(genre = '') {
  const container = document.getElementById('year2025-container');
  const cached = genreCache[genre];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    renderTracks2025(cached.data);
    return;
  }

  showSpinner(true);
  try {
    const url = genre ? `${YEAR_URL}?genre=${encodeURIComponent(genre)}` : YEAR_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    genreCache[genre] = { ts: Date.now(), data: data.tracks };
    renderTracks2025(data.tracks);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="col-12 text-start text-danger">Не удалось загрузить данные.</div>';
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

  container.querySelectorAll('audio').forEach(audio => {
    audio.addEventListener('play', () => {
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      }
      activeAudio = audio;
    });
    audio.addEventListener('ended', () => {
      if (activeAudio === audio) activeAudio = null;
    });
  });

  document.dispatchEvent(new Event('year2025:rendered'));
}

document.addEventListener('DOMContentLoaded', () => {
  initYearGenreButtons();
  loadYear2025();
});