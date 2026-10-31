/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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

    await import('../../static/js/pwa/register.ts');

    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });

  it('Legacy-режим: сгенерированный IIFE ведёт себя так же', () => {
    const legacyCode = readFileSync('static/js/pwa/register.js', 'utf8');
    const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'outside-only' });
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(dom.window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    dom.window.eval(legacyCode);
    dom.window.dispatchEvent(new dom.window.Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });

    dom.window.close();
  });

  it('Legacy-режим: без navigator.serviceWorker ничего не регистрирует и не падает', () => {
    const legacyCode = readFileSync('static/js/pwa/register.js', 'utf8');
    const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'outside-only' });
    const register = vi.fn();

    expect(() => dom.window.eval(legacyCode)).not.toThrow();
    dom.window.dispatchEvent(new dom.window.Event('load'));
    expect(register).not.toHaveBeenCalled();

    dom.window.close();
  });
});
