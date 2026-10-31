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
      "static/js/animation/hamburger_animation.js",
      "static/js/UI/avatar_actions_toggle.js",
      "static/js/UI/clear_search_button.js",
      "static/js/UI/search_button_scroll.js",
      "static/js/UI/theme_toggle.js",
      "static/js/pwa/register.js",
      "static/js/features/realtime_notifications.js",
      "static/js/features/realtime_presence.js",
      "static/js/features/public_playlists_dashboard.js",
      "static/js/UI/now_playing.js",
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
        Event: "readonly",
        window: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
];