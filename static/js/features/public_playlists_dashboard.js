const PublicPlaylistsDashboard = {
  URL: '/api/playlists/public/trending/?limit=6',

  render(items) {
    const root = document.getElementById('public-playlists-dashboard');
    const block = document.getElementById('public-playlists-dashboard-block');
    if (!root || !block) return;

    if (!items || !items.length) {
      root.replaceChildren();
      block.style.display = 'none';
      return;
    }

    block.style.display = '';
    root.replaceChildren();
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const col = document.createElement('div');
      col.className = 'col';

      const card = document.createElement('a');
      card.className = 'card h-100 text-decoration-none dashboard-card shadow-sm';
      card.href = `/u/${encodeURIComponent(item.username)}/`;

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body d-flex gap-3 align-items-center';

      const avatar = document.createElement('div');
      avatar.className = 'rounded-circle border d-flex align-items-center justify-content-center flex-shrink-0';
      avatar.style.width = '56px';
      avatar.style.height = '56px';
      avatar.style.overflow = 'hidden';
      avatar.style.background = '#fff';

      if (item.avatar_url) {
        const img = document.createElement('img');
        img.src = item.avatar_url;
        img.alt = item.username;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        avatar.appendChild(img);
      } else {
        avatar.innerHTML = '<i class="bi bi-person-fill text-danger"></i>';
      }

      const info = document.createElement('div');
      info.className = 'min-w-0';

      const title = document.createElement('div');
      title.className = 'fw-semibold text-dark text-truncate';
      title.textContent = item.username;

      const playlistTitle = document.createElement('div');
      playlistTitle.className = 'small text-body text-truncate';
      playlistTitle.textContent = item.playlist_title || 'Favorites';

      const meta = document.createElement('div');
      meta.className = 'small text-muted';
      meta.textContent = `Треков: ${item.tracks_count || 0} - Лайков: ${item.likes_count || 0}`;

      info.append(title, playlistTitle, meta);
      cardBody.append(avatar, info);
      card.appendChild(cardBody);
      col.appendChild(card);
      fragment.appendChild(col);
    });

    root.appendChild(fragment);
    document.dispatchEvent(new Event('publicPlaylists:rendered'));
  },

  async load() {
    try {
      const data = await Utils.fetchData(this.URL);
      const items = Array.isArray(data.results) ? data.results : [];
      this.render(items);
    } catch (error) {
      console.error('Public playlists dashboard load error:', error);
      this.render([]);
    }
  },

  init() {
    if (!document.getElementById('public-playlists-dashboard')) return;
    this.load();
  }
};

document.addEventListener('DOMContentLoaded', () => PublicPlaylistsDashboard.init());
