/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';

/**
 * pwa/register: регистрирует service worker после события load.
 *
 * Vite-режим: модуль — IIFE на импорте, поэтому DOM/заглушка navigator
 * настраиваются до динамического импорта TS-источника.
 */
describe('pwa/register — оба режима загрузки', () => {
  it('Vite-режим: регистрирует service worker по адресу /service-worker.js', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    // @ts-expect-error — статический TS-модуль без ESM-типов
    await import('../../static/js/pwa/register.ts');

    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });
});
