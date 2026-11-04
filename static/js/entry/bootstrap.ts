/**
 * Entry-точка Vite-бандла (Фаза 2 миграции; Фаза 4 — vendor из node_modules).
 *
 * Первым импортируется vendor-globals: он подключает CSS (bootstrap-icons,
 * bootstrap, hamburgers) и выставляет window-глобалы (gsap/плагины,
 * bootstrap, WaveSurfer, emoji-picker), заменяя прежние script-теги из
 * static/vendor (см. static/js/entry/vendor-globals.ts).
 *
 * Далее порядок импортов СТРОГО повторяет порядок first-party script-тегов в
 * music_api/templates/base.html — это гарантирует прежнюю семантику:
 *  - провайдеры window.* (Spinners, PublicCommentsAnimation, animateGenreBtn,
 *    favorite-button API и т.д.) выполняются раньше потребителей;
 *  - DOMContentLoaded-листенеры регистрируются в исходном порядке.
 *
 * Все импорты — только за побочными эффектами (classic-скрипты пишут
 * в window/global и сами подписываются на DOMContentLoaded).
 */
import './vendor-globals.ts';

import '../pwa/register.ts';

// Анимации и визуальные эффекты (порядок как в base.html)
import '../animation/track-animations.ts';
import '../animation/animation_home.ts';
import '../animation/card_search_animation.ts';
import '../animation/alert_log_animation.ts';
import '../animation/auth_widget_animation.ts';
import '../animation/carousel_animation.ts';
import '../animation/hamburger_animation.ts';
import '../animation/navbar_logo_collapse_animation.ts';
import '../animation/radial_reveal_animation.ts';
import '../animation/spinner_animation.ts';
import '../animation/profile_stagger_animation.ts';
import '../animation/playlist_stagger_animation.ts';
import '../animation/public_profile_stagger_animation.ts';
import '../animation/artist_bio_modal_close_animation.ts';
import '../animation/public_comments_animation.ts';
import '../animation/wavesurfer_morph_button.ts';

// Фичи сайта (modules/features)
import '../features/trending.ts';
import '../features/year2025.ts';
import '../features/public_playlists_dashboard.ts';
import '../features/music_search.ts';
import '../features/artist_wikipedia_modal.ts';
import '../features/realtime_notifications.ts';
import '../features/realtime_presence.ts';
import '../features/public_playlist_comments.ts';

// Поиск и UI-специфичные скрипты
import '../UI/scrollbutton.ts';
import '../UI/search_button_scroll.ts';
import '../UI/clear_search_button.ts';
import '../UI/search_autocomplete.ts';
import '../UI/playlists.ts';
import '../UI/public-playlist.ts';
import '../UI/avatar_actions_toggle.ts';
import '../UI/theme_toggle.ts';

// Утилиты
import '../utils/utils.ts';
import '../UI/now_playing.ts';

// Favorite Button
import '../UI/favorite-button.ts';

/**
 * Восстановление глобального контракта.
 *
 * `Utils` — top-level `const` в utils.ts (в классическом скрипте это был global;
 * см. docs/frontend-global-contract.md). В ESM-бандле он изолирован в модуле,
 * поэтому для потребителей, которые ссылаются на `Utils` без `window.`,
 * привязываем его к глобалу явно. Файл utils.ts дополнительно выполняет
 * `window.Utils = Utils;` при импорте (см. конец utils.ts).
 */
(globalThis as unknown as { Utils: unknown }).Utils = window.Utils;
