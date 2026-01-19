const TRENDING_URL = '/music_api/trending/';

async function loadTrending() {
  try {
    const res = await fetch(TRENDING_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderCards(data.artists);
  } catch (e) {
    console.error(e);
    document.getElementById('trending-container').innerHTML =
      '<div class="col-12 text-center text-danger">Не удалось загрузить данные.</div>';
  }
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
      <div class="card h-100 shadow-sm">
        <div class="row g-0 h-100">
          <div class="col-md-4">
            <img src="${a.photo_url}" class="img-fluid rounded-start h-100 object-fit-cover" alt="${a.name}">
          </div>
          <div class="col-md-8 d-flex flex-column">
            <div class="card-body">
              <h5 class="card-title mb-1">${a.name}</h5>
            </div>
            <div class="card-footer bg-white mt-auto">
              <small class="text-muted">Последние релизы:</small>
              <ul class="list-unstyled mb-0 mt-1">
                ${a.releases.map(r => `
                  <li class="d-flex align-items-center mb-1">
                    <img src="${r.cover}" width="32" height="32" class="rounded me-2" alt="">
                    <div>
                      <div class="fw-semibold">${r.title}</div>
                      <div class="small text-muted">${r.playcount} прослушиваний</div>
                    </div>
                  </li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', loadTrending);