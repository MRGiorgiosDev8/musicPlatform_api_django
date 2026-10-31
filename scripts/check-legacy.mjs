/**
 * Проверка актуальности сгенерированных legacy-JS относительно TS-источников.
 *
 * esbuild собирает в память (write: false), результат сверяется с существующими
 * файлами. При любом рассинхроне — ненулевой exit code со списком проблемных файлов.
 * Список модулей — в scripts/legacy-modules.mjs.
 *
 * Запуск: npm run check:legacy
 */
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { LEGACY_MODULES, legacyOptions, legacyOutfile } from './legacy-modules.mjs';

let mismatched = false;

for (const source of LEGACY_MODULES) {
  const outfile = legacyOutfile(source);
  const result = await build({ ...legacyOptions(source), write: false });
  const generated = result.outputFiles[0].text;
  const current = await readFile(outfile, 'utf8');

  if (generated !== current) {
    mismatched = true;
    console.error(
      `check:legacy: ${outfile} устарел относительно ${source}. Выполните: npm run build:legacy`
    );
  }
}

if (mismatched) {
  process.exit(1);
}

console.log('check:legacy: OK — все legacy-JS соответствуют TS-источникам');
