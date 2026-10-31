import { defineConfig } from 'vite';

/**
 * Конфигурация Vite-сборки фронтенда (Фаза 2 миграции).
 *
 * Собирает ВСЮ первую-party JS (static/js) в один entry-бандл, повторяя
 * порядок и поведение script-тегов из base.html. Результат кладётся в
 * static/frontend (подхватывается collectstatic/WhiteNoise).
 *
 * Подробности и обоснование: docs/frontend-global-contract.md
 */
export default defineConfig({
  base: '/static/frontend/',
  publicDir: false,
  build: {
    outDir: 'static/frontend',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        bootstrap: 'static/js/entry/bootstrap.js',
      },
    },
  },
});