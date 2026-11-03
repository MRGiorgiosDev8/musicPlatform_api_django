// Разрешение импортов CSS-файлов в Vite-сборке (vendor-стили из node_modules,
// например bootstrap-icons/font/bootstrap-icons.css в static/js/entry/vendor-globals.js).
// Vite обрабатывает такие импорты на этапе сборки, TypeScript — нет.
declare module '*.css';
