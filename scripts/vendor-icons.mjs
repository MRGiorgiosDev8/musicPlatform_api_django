// Воспроизводимое копирование bootstrap-icons (CSS + шрифты) из node_modules
// в static/vendor/bootstrap-icons/font с сохранением относительной структуры
// font/fonts: CSS ссылается на `./fonts/...`.
// Использование: npm run vendor:icons  (после обновления версии bootstrap-icons)
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'bootstrap-icons', 'font');
const dest = path.join(root, 'static', 'vendor', 'bootstrap-icons', 'font');

await mkdir(path.join(dest, 'fonts'), { recursive: true });
await cp(path.join(src, 'bootstrap-icons.css'), path.join(dest, 'bootstrap-icons.css'));
await cp(path.join(src, 'fonts', 'bootstrap-icons.woff'), path.join(dest, 'fonts', 'bootstrap-icons.woff'));
await cp(path.join(src, 'fonts', 'bootstrap-icons.woff2'), path.join(dest, 'fonts', 'bootstrap-icons.woff2'));

console.log('[vendor:icons] bootstrap-icons скопированы в static/vendor/bootstrap-icons/font');