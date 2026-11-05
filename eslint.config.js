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
      ecmaVersion: "latest",
      sourceType: "module",
      globals: testGlobals,
    },
    rules: {
      "no-undef": "off",
    },
  },
);