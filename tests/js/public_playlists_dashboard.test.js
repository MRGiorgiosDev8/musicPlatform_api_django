/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
// Модуль использует глобальный Utils.fetchData — подменяем его до dispatch.
import '../../static/js/features/public_playlists_dashboard.ts';

const MARKUP = `
  <div id="public-playlists-dashboard"></div>
  <div id="public-playlists-dashboard-block"></div>
`;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete window.Utils;
  document.body.innerHTML = '';
});

describe('public_playlists_dashboard — оба режима загрузки', () => {
  it('Vite-режим: рендерит карточки плейлистов и диспатчит событие', async () => {
    document.body.innerHTML = MARKUP;
    window.Utils = {
      fetchData: vi.fn().mockResolvedValue({
        results: [
          {
            username: 'alice',
            playlist_title: 'Best of 2026',
            tracks_count: 3,
            likes_count: 5,
            avatar_url: 'http://x.test/a.png',
          },
          { username: 'bob' },
        ],
      }),
    };

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const root = document.getElementById('public-playlists-dashboard');
    const block = document.getElementById('public-playlists-dashboard-block');

    expect(window.Utils.fetchData).toHaveBeenCalledWith('/api/playlists/public/trending/?limit=6');
    expect(root.querySelectorAll('.dashboard-card').length).toBe(2);

    const firstCard = root.querySelector('.dashboard-card');
    expect(firstCard.getAttribute('href')).toBe('/u/alice/');
    expect(firstCard.querySelector('.dashboard-avatar-img').getAttribute('src')).toBe(
      'http://x.test/a.png'
    );
    expect(firstCard.textContent).toContain('alice');
    expect(firstCard.textContent).toContain('Best of 2026');
    expect(firstCard.textContent).toContain('Треков: 3 - Лайков: 5');

    // пользователь без avatar_url получает иконку
    const secondCard = root.querySelectorAll('.dashboard-card')[1];
    expect(secondCard.querySelector('i.bi-person-fill')).toBeTruthy();
    expect(secondCard.textContent).toContain('Favorites');

    expect(block.style.display).not.toBe('none');
  });

  it('Vite-режим: пустой ответ скрывает блок', async () => {
    document.body.innerHTML = MARKUP;
    window.Utils = { fetchData: vi.fn().mockResolvedValue({}) };

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const root = document.getElementById('public-playlists-dashboard');
    const block = document.getElementById('public-playlists-dashboard-block');
    expect(root.children.length).toBe(0);
    expect(block.style.display).toBe('none');
  });
});
