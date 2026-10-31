/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.listeners = {};
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, cb) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  send() {}

  close() {}

  emit(type, data) {
    (this.listeners[type] || []).forEach((cb) =>
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
    window.WebSocket = FakeWebSocket;
    FakeWebSocket.instances = [];

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const list = document.getElementById('like-notifications-list');
    const empty = document.getElementById('like-notifications-empty');
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
    const item = items[0];
    expect(item.dataset.notificationId).toBe('42');
    expect(item.dataset.actorId).toBe('7');
    expect(item.dataset.playlistId).toBe('9');
    expect(item.querySelector('strong').textContent).toBe('alice');
    expect(item.querySelector('a').getAttribute('href')).toBe('/u/alice/');
    expect(empty.classList.contains('d-none')).toBe(true);

    socket.emit('message', { type: 'playlist_like_removed', notification_id: 42 });
    expect(list.querySelectorAll('.js-like-notification-item').length).toBe(0);
    expect(empty.classList.contains('d-none')).toBe(false);
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/features/realtime_notifications.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${MARKUP}</body></html>`, {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    });
    dom.window.WebSocket = FakeWebSocket;
    FakeWebSocket.instances = [];
    dom.window.document.body.dataset.isAuthenticated = 'true';

    dom.window.eval(legacyCode);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const list = dom.window.document.getElementById('like-notifications-list');
    const empty = dom.window.document.getElementById('like-notifications-empty');
    const socket = FakeWebSocket.instances[0];

    expect(socket.url).toBe('ws://localhost/ws/notifications/');

    socket.emit('message', {
      type: 'playlist_like',
      notification_id: '13',
      actor_id: 3,
      playlist_id: 5,
      actor_username: 'bob',
    });

    const items = list.querySelectorAll('.js-like-notification-item');
    expect(items.length).toBe(1);
    expect(items[0].dataset.notificationId).toBe('13');
    expect(items[0].querySelector('strong').textContent).toBe('bob');
    expect(empty.classList.contains('d-none')).toBe(true);

    socket.emit('message', { type: 'playlist_like_removed', actor_id: 3, playlist_id: 5 });
    expect(list.querySelectorAll('.js-like-notification-item').length).toBe(0);
    expect(empty.classList.contains('d-none')).toBe(false);

    dom.window.close();
  });
});
