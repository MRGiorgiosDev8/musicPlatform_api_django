/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Vite-режим: импорт TS-источника (side-effect) регистрирует DOMContentLoaded-listener.
import '../../static/js/features/realtime_presence.ts';

const MARKUP = `
  <div data-presence-badge data-presence-user-id="7" data-presence-online="false" data-presence-last-seen="12:30">
    <span class="presence-dot"></span>
    <span class="presence-label"></span>
  </div>
  <div data-presence-badge data-presence-user-id="8" data-presence-online="true">
    <span class="presence-dot"></span>
    <span class="presence-label"></span>
  </div>
`;

// jsdom не реализует WebSocket — фиктивный класс записывает экземпляры,
// исходящие сообщения и может «принимать» входящие.
class FakeWebSocket {
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.listeners = {};
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, cb) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  send(data) {
    this.sent.push(data);
  }

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

describe('realtime_presence — оба режима загрузки', () => {
  it('Vite-режим: применяет начальное состояние и обновляет бейджи по WebSocket', () => {
    document.body.innerHTML = MARKUP;
    window.WebSocket = FakeWebSocket;
    FakeWebSocket.instances = [];

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const badge7 = document.querySelector('[data-presence-user-id="7"]');
    const badge8 = document.querySelector('[data-presence-user-id="8"]');
    const socket = FakeWebSocket.instances[0];

    expect(socket).toBeTruthy();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    expect(socket.url).toBe(`${wsProtocol}://${window.location.host}/ws/presence/`);

    // начальное состояние из data-атрибутов
    expect(badge7.dataset.presenceOnline).toBe('false');
    expect(badge7.querySelector('.presence-label').textContent).toBe('Был(а): 12:30');
    expect(badge7.querySelector('.presence-dot').classList.contains('is-online')).toBe(false);

    expect(badge8.dataset.presenceOnline).toBe('true');
    expect(badge8.querySelector('.presence-label').textContent).toBe('Онлайн');
    expect(badge8.querySelector('.presence-dot').classList.contains('is-online')).toBe(true);

    // после open рассылаются watch_user по всем id
    socket.emit('open', '');
    expect(socket.sent).toEqual([
      JSON.stringify({ action: 'watch_user', user_id: 7 }),
      JSON.stringify({ action: 'watch_user', user_id: 8 }),
    ]);

    // онлайн для офлайн-пользователя
    socket.emit('message', { type: 'presence_status', user_id: '7', is_online: true });
    expect(badge7.dataset.presenceOnline).toBe('true');
    expect(badge7.querySelector('.presence-label').textContent).toBe('Онлайн');

    // возврат в офлайн с last_seen_display
    socket.emit('message', {
      type: 'presence_status',
      user_id: '7',
      is_online: false,
      last_seen_display: 'вчера в 22:00',
    });
    expect(badge7.dataset.presenceOnline).toBe('false');
    expect(badge7.querySelector('.presence-label').textContent).toBe('Был(а): вчера в 22:00');

    // посторонний тип события игнорируется без ошибок
    socket.emit('message', { type: 'some_other_event' });
  });
});
