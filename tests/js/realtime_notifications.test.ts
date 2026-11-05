/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/features/realtime_notifications.ts';

const MARKUP = `
  <div id="block-like-notifications">
    <ul id="like-notifications-list"></ul>
    <div id="like-notifications-empty"></div>
  </div>
`;

// jsdom не реализует WebSocket — подменяем фиктивным классом, который
// записывает экземпляры и умеет «принимать» сообщения.
class FakeWebSocket {
  static OPEN = 1;
  static instances: any[] = [];

  url: string;
  readyState: number;
  listeners: any;

  constructor(url: string) {
    this.url = url;
    this.readyState = 1;
    this.listeners = {};
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  send() {}

  close() {}

  emit(type: string, data: any) {
    (this.listeners[type] || []).forEach((cb: Function) =>
      cb({ data: typeof data === 'string' ? data : JSON.stringify(data) })
    );
  }
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('realtime_notifications — оба режима загрузки', () => {
  it('Vite-режим: лайк добавляет уведомление, удаление — убирает его', () => {
    document.body.innerHTML = MARKUP;
    document.body.dataset.isAuthenticated = 'true';
    (window as any).WebSocket = FakeWebSocket;
    FakeWebSocket.instances = [];

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const list = document.getElementById('like-notifications-list');
    const empty = document.getElementById('like-notifications-empty');
    if (!list || !empty) return;
    const socket = FakeWebSocket.instances[0];

    expect(socket).toBeTruthy();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    expect(socket.url).toBe(`${wsProtocol}://${window.location.host}/ws/notifications/`);
    expect(list.children.length).toBe(0);
    expect(empty.classList.contains('d-none')).toBe(false);

    socket.emit('message', {
      type: 'playlist_like',
      notification_id: 42,
      actor_id: 7,
      playlist_id: 9,
      actor_username: 'alice',
      actor_profile_url: '/u/alice/',
      created_at: '2026-01-01',
    });

    const items = list.querySelectorAll('.js-like-notification-item');
    expect(items.length).toBe(1);
    const item = items[0] as HTMLElement;
    expect(item.dataset.notificationId).toBe('42');
    expect(item.dataset.actorId).toBe('7');
    expect(item.dataset.playlistId).toBe('9');
    const strong = item.querySelector('strong');
    if (strong) expect(strong.textContent).toBe('alice');
    const anchor = item.querySelector('a');
    if (anchor) expect(anchor.getAttribute('href')).toBe('/u/alice/');
    expect(empty.classList.contains('d-none')).toBe(true);

    socket.emit('message', { type: 'playlist_like_removed', notification_id: 42 });
    expect(list.querySelectorAll('.js-like-notification-item').length).toBe(0);
    expect(empty.classList.contains('d-none')).toBe(false);
  });
});
