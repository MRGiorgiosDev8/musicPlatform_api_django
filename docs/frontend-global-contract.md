# Карта глобального контракта фронтенда

Документ — результат **Фазы 0** миграции на Vite + TypeScript.
Фиксирует межфайловые связи фронтенда, которые опираются на общий глобальный scope
классических скриптов. Это критерий «логика не изменилась» на время миграции.

> Дата фиксации: 2026-10-31 · ветка `main` · коммит `6d05798`.

## Базовая линия (что замерено)

| Проверка | Результат |
|---|---|
| `npm run test:js` | **54 passed** (9 файлов) |
| `npm run lint:js` (ESLint) | **ok** (0 ошибок) |
| `npm run format:check` (Prettier) | **НЕ проходит**: 10 файлов не отформатированы (не входит в CI) |

Файлы, не проходящие `format:check`: `animation/wavesurfer_morph_button.js`,
`features/music_search.js`, `features/public_playlist_comments.js`, `features/year2025.js`,
`pwa/register.js`, `UI/now_playing.js`, `UI/playlists.js`, `UI/public-playlist.js`,
`UI/theme_toggle.js`, `tests/js/public-playlist-comments.test.js`.

## Модель глобального контекста

- Все first-party скрипты — **классические** (`<script>` без `type="module"`), грузятся в
  `music_api/templates/base.html` (~30 тегов) **в строгом порядке** и делят общий global scope.
- Top-level `const` в классическом скрипте становится глобальной lexical binding, видимой
  другим скриптам на странице (поэтому `Utils` доступен без `window.`).
- Cross-файловые ссылки реализованы двумя способами:
  1. `window.X = ...` (явная привязка) — провайдеры; потребители всегда проверяют
     `typeof window.X === 'function'` или `window.X?....`.
  2. неявный global (без `window.`) — только `Utils`.
- В ES-модулях этой модели не будет: top-level binding изолирован в модуле, поэтому
  при бандлинге (Фаза 2/3) контракт должен восстанавливаться явно (через `window/globalThis`
  или `import`) до полной конвертации графа.

## 1. First-party глобалы, определяемые приложением

### `Utils` — НЕ привязан к `window` (top-level `const`)

- **Определение:** `static/js/utils/utils.js`
- **Потребители:** `features/music_search.js`, `features/public_playlists_dashboard.js`,
  `features/trending.js`, `features/year2025.js`, `UI/playlists.js`, `UI/public-playlist.js`.
- Доступ всегда через guard: `typeof Utils === 'undefined'` / `typeof Utils.xxx === 'function'`.
- Методы: `CACHE_TTL`, `GENRES`, `showTrendingSpinner`, `showYearSpinner`, `initGenreButtons`,
  `getCached`, `setCache`, `renderEmpty`, `showError`, `fetchData`, `hasAudioPreview`,
  `getNoPreviewBadgeClasses`, `formatTime`, `initAudioPreviews`, `createChevronDownIcon`,
  `createShowMoreButton`, `closeParentOffcanvas`, `syncInfiniteMarquee`.

### Провайдеры через `window.*` + их потребители

| Глобал | Провайдер | Потребители | Особенности |
|---|---|---|---|
| `window.Spinners` (`{trending, year, search}` объекты спиннеров) | `animation/spinner_animation.js` (L121) | `utils/utils.js`, `features/music_search.js` | доступ через `window.Spinners?....` |
| `window.animateGenreBtn` | `animation/radial_reveal_animation.js` (L104) | `utils/utils.js` | guard `typeof animateGenreBtn === 'function'` |
| `window.showActiveReveal` | `animation/radial_reveal_animation.js` (L109) | `utils/utils.js` | guard `typeof showActiveReveal === 'function'` |
| `window.hideActiveReveal` | `animation/radial_reveal_animation.js` (L114) | `utils/utils.js` | guard `typeof hideActiveReveal === 'function'` |
| `window.PublicCommentsAnimation` | `animation/public_comments_animation.js` (L126) | `features/public_playlist_comments.js`, `UI/public-playlist.js` | guard `typeof window.PublicCommentsAnimation.<m>` |
| `window.createFavoriteButtonWithCheck` | `UI/favorite-button.js` (L257) | `features/music_search.js`, `features/year2025.js` | асинхронный; guard `typeof window... === 'function'` |
| `window.createFavoriteButton` | `UI/favorite-button.js` (L258) | тесты, потенциально другие | — |
| `window.isTrackFavorite` | `UI/favorite-button.js` (L259) | тесты | — |
| `window.getCSRFToken` | `UI/favorite-button.js` (L260) | тесты | читает `<meta name="csrf-token">` |
| `window.getJWTToken` | `UI/favorite-button.js` (L261) | тесты | localStorage fallback-цепочка |
| `window.buildAuthHeaders` | `UI/favorite-button.js` (L262) | `features/public_playlist_comments.js`, `features/artist_wikipedia_modal.js`, `UI/playlists.js`, `UI/public-playlist.js` | есть guard'ы |
| `window.resetFavoritesCache` | `UI/favorite-button.js` (L263) | тесты | — |
| `window.triggerHapticFeedback` | `UI/favorite-button.js` (L264) | `UI/public-playlist.js` | guard |
| `window.isIOSDevice` | `UI/favorite-button.js` (L265) | тесты | — |

## 2. Глобалы vendor и браузера (не first-party)

### Из script-тегов `base.html` (порядок загрузки важен)

| Глобал | Источник | Кто использует |
|---|---|---|
| `bootstrap` (bare) | `static/vendor/bootstrap/js/bootstrap.bundle.min.js` | `utils/utils.js`, `animation/artist_bio_modal_close_animation.js`, `features/artist_wikipedia_modal.js`, `features/music_search.js`, `features/year2025.js` |
| `gsap` (bare) | `static/vendor/gsap/gsap.min.js` | 18 файлов (все `animation/*`, `UI/playlists.js`, `UI/scrollbutton.js`, `utils/utils.js`) |
| `window.MorphSVGPlugin` | `static/vendor/gsap/MorphSVGPlugin.min.js` | `animation/wavesurfer_morph_button.js` |
| `SplitText` (bare) | `static/vendor/gsap/SplitText.min.js` | `animation/track-animations.js` |
| `DrawSVGPlugin` (bare) | `static/vendor/gsap/DrawSVGPlugin.min.js` | `animation/spinner_animation.js` |
| `ScrollToPlugin` (bare) | `static/vendor/gsap/ScrollToPlugin.min.js` | `UI/scrollbutton.js` |
| `window.WaveSurfer` | `static/vendor/wavesurfer/wavesurfer.min.js` | `utils/utils.js` |
| `<emoji-picker>` custom element | `static/vendor/emoji-picker-element/index.js` (`type="module"`) | `features/public_playlist_comments.js` (getElementById + shadow DOM) |

Регистрируются так: `gsap.registerPlugin(...)` в `spinner_animation.js` (DrawSVGPlugin),
`scrollbutton.js` (ScrollToPlugin), `wavesurfer_morph_button.js` (MorphSVGPlugin) —
т.е. имеет значение порядок vendor-тегов **до** first-party.

### Внешние/браузерные

- `window.TapticEngine` — внешний iOS-хелпер, используется в `UI/favorite-button.js` (guard-ом).
- Браузерные прочее: `window.matchMedia` (5 файлов), `window.IntersectionObserver`
  (`animation_home.js`, `playlist_stagger_animation.js`), `window.AbortController`
  (`UI/search_autocomplete.js`), `new window.Image()` (`features/artist_wikipedia_modal.js`),
  стандартные `window.setTimeout/clearTimeout/requestAnimationFrame/matchMedia/scrollY...`.

## 3. App-объекты, живущие внутри своего файла (НЕ контракт)

Определяются и используются только в пределах своего файла — при бандлинге не требуют
глобальной привязки, но всё равно самоинициализируются на `DOMContentLoaded`:

- `TrendingApp` — `features/trending.js`
- `Year2025App` — `features/year2025.js`
- `PublicPlaylistsDashboard` — `features/public_playlists_dashboard.js`
- `SearchAnimations` — `animation/card_search_animation.js`
- `Animations` — `animation/animation_home.js`
- локальные константы/функции по файлам (защищены проверкой наличия DOM-узлов)

## 4. Мост для тестов (CommonJS-экспорт)

Файлы с блоком `if (typeof module !== 'undefined' && module.exports) {...}` — двойной режим
(браузер через window/global + Node для Vitest):

`features/year2025.js · features/music_search.js · features/trending.js ·
features/artist_wikipedia_modal.js · UI/public-playlist.js · UI/search_autocomplete.js ·
UI/favorite-button.js · UI/playlists.js`

Тесты (`tests/js/*.test.js`, 9 файлов / 54 теста) импортируют их через
`createRequire(import.meta.url).require('../../static/js/...')`. Все тестовые файлы объявляют
`/* @vitest-environment jsdom */`.

## 5. Контекст от Django (шаблоны)

- `<meta name="csrf-token">` — читается `getCSRFToken()`.
- `<body data-is-search-page data-is-authenticated>` — читается JS (`music_search.js` и др.).
- Данные на узлах через `data-*` атрибуты (`data-audio-preview-url`, `data-artist-name`,
  `data-public-username`, `data-track-*`, ...).
- Inline-скрипты в `base.html` (`site-theme` IIFE, `application/ld+json`) — вне зоны бандла.