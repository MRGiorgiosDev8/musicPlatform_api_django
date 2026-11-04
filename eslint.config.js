/**
 * Глобальные идентификаторы первого-party JS в браузере.
 * Общие для классических скриптов и Vite entry (static/js/entry).
 */
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  fetch: "readonly",
  bootstrap: "readonly",
  gsap: "readonly",
  URLSearchParams: "readonly",
  MutationObserver: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  HTMLAudioElement: "readonly",
  Node: "readonly",
  URL: "readonly",
  sessionStorage: "readonly",
  requestAnimationFrame: "readonly",
  getComputedStyle: "readonly",
  WebSocket: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  ScrollToPlugin: "readonly",
  DrawSVGPlugin: "readonly",
  SplitText: "readonly",
  Utils: "readonly",
  animateGenreBtn: "readonly",
  showActiveReveal: "readonly",
  hideActiveReveal: "readonly",
  module: "readonly",
};

// Глобалы для тестов (общие для *.js и *.ts).
const testGlobals = {
  describe: "readonly",
  it: "readonly",
  expect: "readonly",
  beforeEach: "readonly",
  vi: "readonly",
  global: "readonly",
  Utils: "readonly",
  document: "readonly",
  Event: "readonly",
  window: "readonly",
  localStorage: "readonly",
  setTimeout: "readonly",
  console: "readonly",
};

const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "staticfiles/**",
      ".venv/**",
    ],
  },
  {
    // Регистрируем TypeScript-парсер и плагин глобально. Правил
    // @typescript-eslint/* не включаем — ведём себя как с базовыми script-скриптами.
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  {
    files: ["static/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    // Vite entry — ES-модуль (import), остальные правила как у script-скриптов.
    files: ["static/js/entry/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["tests/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: testGlobals,
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    // Классические TypeScript-скрипты — как script-скрипты с browser-глобалами.
    //
    // no-undef выключен для .ts: ESLint-core no-undef не понимает type-only
    // глобальные имена (Element, HTMLElement, Document и т.п.) из TS-библиотеки
    // DOM и даёт на них ложные срабатывания. Неопределённые идентификаторы в TS
    // проверяет сам компилятор (npm run typecheck / tsc --noEmit).
    files: ["static/js/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "off",
    },
  },
  {
    // Vite entry TS — ES-модуль (import), остальное как у script-скриптов.
    files: ["static/js/entry/**/*.ts"],
    languageOptions: {
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["tests/js/**/*.ts"],
    languageOptions: {
      sourceType: "module",
      globals: testGlobals,
    },
    rules: {
      "no-undef": "off",
    },
  },
);