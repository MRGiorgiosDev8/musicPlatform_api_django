/**
 * Проверка актуальности сгенерированного legacy-JS относительно TS-источника.
 *
 * Источник правды: static/js/animation/hamburger_animation.ts
 * Legacy-файл:    static/js/animation/hamburger_animation.js (генерируется `npm run build:legacy`)
 *
 * Сравнение выполняется без записи на диск: esbuild собирает в память (write: false),
 * результат сверяется с существующим файлом. При рассинхроне — ненулевой exit code.
 */
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const SOURCE = 'static/js/animation/hamburger_animation.ts';
const LEGACY = 'static/js/animation/hamburger_animation.js';

const result = await build({
  entryPoints: [SOURCE],
  bundle: true,
  format: 'iife',
  write: false,
});

const generated = result.outputFiles[0].text;
const current = await readFile(LEGACY, 'utf8');

if (generated !== current) {
  console.error(
    `check:legacy: ${LEGACY} устарел относительно ${SOURCE}. Выполните: npm run build:legacy`
  );
  process.exit(1);
}

console.log('check:legacy: OK — legacy-JS соответствует TS-источнику');
