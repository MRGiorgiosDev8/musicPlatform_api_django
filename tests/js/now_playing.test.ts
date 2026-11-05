/* @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';

const MARKUP = `
  <div id="nowPlayingBar">
    <button id="nowPlayingToggle"></button>
    <button id="nowPlayingJump"></button>
    <button id="nowPlayingClose"></button>
    <span id="nowPlayingTitle"></span>
    <span id="nowPlayingArtist"></span>
    <span id="nowPlayingTime"></span>
    <div id="nowPlayingProgressBar"></div>
  </div>
`;

const createCardWithMount = (windowRef: Window, trackName: string) => {
  const card = windowRef.document.createElement('div');
  card.className = 'card';
  card.dataset.trackName = trackName;
  card.dataset.trackArtist = 'Test Artist';
  const mount = windowRef.document.createElement('div');
  mount.className = 'audio-preview-player';
  card.appendChild(mount);
  windowRef.document.body.appendChild(card);
  return { card, mount };
};

const createWsMock = () => ({
  isPlaying: vi.fn(() => true),
  play: vi.fn(),
  pause: vi.fn(),
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('now_playing — оба режима загрузки', () => {
  it('Vite-режим: плей/пауза/timeupdate/jump/close/error обновляют мини-плеер', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = MARKUP;
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    // Модуль — IIFE на импорте и сразу читает DOM, поэтому DOM готовим до импорта.
    // @ts-expect-error — классический скрипт без ESM-экспортов
    await import('../../static/js/UI/now_playing.ts');

    const ws = createWsMock();
    const { card, mount } = createCardWithMount(window, 'Test Track');

    window.document.dispatchEvent(
      new window.CustomEvent('ruby:preview:play', {
        detail: { mount, currentTime: 30, duration: 120, ws },
      })
    );

    const bar = window.document.getElementById('nowPlayingBar')!;
    const title = window.document.getElementById('nowPlayingTitle')!;
    const artist = window.document.getElementById('nowPlayingArtist')!;
    const time = window.document.getElementById('nowPlayingTime')!;
    const progress = window.document.getElementById('nowPlayingProgressBar')!;
    const toggle = window.document.getElementById('nowPlayingToggle')!;
    const jump = window.document.getElementById('nowPlayingJump') as HTMLButtonElement;

    expect(title.textContent).toBe('Test Track');
    expect(artist.textContent).toBe('Test Artist');
    expect(time.textContent).toBe('0:30 / 2:00');
    expect(progress.style.width).toBe('25%');
    expect(bar.classList.contains('is-playing')).toBe(true);
    expect(toggle.classList.contains('is-playing')).toBe(true);
    expect(jump.disabled).toBe(false);

    // toggle при isPlaying() === true ставит на паузу
    toggle.click();
    expect(ws.pause).toHaveBeenCalledTimes(1);

    // timeupdate
    window.document.dispatchEvent(
      new window.CustomEvent('ruby:preview:timeupdate', {
        detail: { currentTime: 60, duration: 120, ws },
      })
    );
    expect(time.textContent).toBe('1:00 / 2:00');

    // jump скроллит к карточке и временно подсвечивает её
    jump.click();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(card.classList.contains('now-playing-source-highlight')).toBe(true);
    vi.advanceTimersByTime(1300);
    expect(card.classList.contains('now-playing-source-highlight')).toBe(false);

    // pause-событие снимает is-playing
    window.document.dispatchEvent(
      new window.CustomEvent('ruby:preview:pause', {
        detail: { currentTime: 60, duration: 120, ws },
      })
    );
    expect(bar.classList.contains('is-playing')).toBe(false);

    // close скрывает бар и ставит на паузу
    window.document.getElementById('nowPlayingClose')!.click();
    expect(ws.pause).toHaveBeenCalledTimes(2);
    expect(bar.classList.contains('is-visible')).toBe(false);

    // error сбрасывает к состоянию по умолчанию
    window.document.dispatchEvent(new window.CustomEvent('ruby:preview:error', { detail: { ws } }));
    expect(title.textContent).toBe('Нет активного трека');
    expect(artist.textContent).toBe('Включите превью');
    expect(time.textContent).toBe('0:00 / 0:00');
    expect(jump.disabled).toBe(true);
  });
});
