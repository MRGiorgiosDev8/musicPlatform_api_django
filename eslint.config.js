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

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "static/vendor/**",
      "staticfiles/**",
      ".venv/**",
    ],
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
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        vi: "readonly",
        global: "readonly",
        Utils: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
];