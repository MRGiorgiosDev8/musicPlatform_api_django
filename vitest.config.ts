import { defineConfig } from 'vitest/config';

/**
 * Конфигурация Vitest для фронтенд-тестов.
 *
 * Отражает прежние «скрытые» настройки:
 * - Все тестовые файлы (`tests/js/*.test.js`) объявляли `/* @vitest-environment jsdom *\/`,
 *   поэтому среда задаётся глобально как `jsdom`.
 * - Файлы классических скриптов импортируются через `createRequire().require(...)`
 *   (CommonJS-мост `module.exports` в исходниках).
 */
export default defineConfig({
  test: {
    include: ['tests/js/**/*.test.{js,ts}'],
    environment: 'jsdom',
  },
});