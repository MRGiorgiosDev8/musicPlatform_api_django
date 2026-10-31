/**
 * Генерация legacy-JS (классических скриптов для fallback-режима base.html)
 * из TS-источников. Список модулей — в scripts/legacy-modules.mjs.
 *
 * Запуск: npm run build:legacy
 */
import { build } from 'esbuild';
import { LEGACY_MODULES, legacyOptions, legacyOutfile } from './legacy-modules.mjs';

let failed = false;

for (const source of LEGACY_MODULES) {
  try {
    await build(legacyOptions(source));
    console.log(`build:legacy: ${legacyOutfile(source)} обновлён (${source})`);
  } catch (error) {
    failed = true;
    console.error(`build:legacy: ошибка для ${source}: ${error.message}`);
  }
}

if (failed) {
  process.exit(1);
}
