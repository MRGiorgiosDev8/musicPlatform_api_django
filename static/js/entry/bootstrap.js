/**
 * Entry-точка Vite-бандла (Фаза 2 миграции).
 *
 * Порядок импортов СТРОГО повторяет порядок first-party script-тегов в
 * music_api/templates/base.html — это гарантирует прежнюю семантику:
 *  - провайдеры window.* (Spinners, PublicCommentsAnimation, animateGenreBtn,
 *    favorite-button API и т.д.) выполняются раньше потребителей;
 *  - DOMContentLoaded-листенеры регистрируются в исходном порядке.
 *
 * Все импорты — только за побочными эффектами (classic-скрипты пишут
 * в window/global и сами подписываются на DOMContentLoaded).
 */
import '../pwa/register.ts';

// Анимации и визуальные эффекты (порядок как в base.html)
import '../animation/track-animations.ts';
import '../animation/animation_home.ts';
import '../animation/card_search_animation.js';
import '../animation/alert_log_animation.js';
import '../animation/auth_widget_animation.ts';
import '../animation/carousel_animation.js';
import '../animation/hamburger_animation.ts';
import '../animation/navbar_logo_collapse_animation.js';
import '../animation/radial_reveal_animation.js';
import '../animation/spinner_animation.js';
import '../animation/profile_stagger_animation.ts';
import '../animation/playlist_stagger_animation.ts';
import '../animation/public_profile_stagger_animation.ts';
import '../animation/artist_bio_modal_close_animation.ts';
import '../animation/public_comments_animation.js';
import '../animation/wavesurfer_morph_button.js';

// Фичи сайта (modules/features)
import '../features/trending.js';
import '../features/year2025.js';
import '../features/public_playlists_dashboard.ts';
import '../features/music_search.js';
import '../features/artist_wikipedia_modal.js';
import '../features/realtime_notifications.ts';
import '../features/realtime_presence.ts';
import '../features/public_playlist_comments.js';

// Поиск и UI-специфичные скрипты
import '../UI/scrollbutton.js';
import '../UI/search_button_scroll.ts';
import '../UI/clear_search_button.ts';
import '../UI/search_autocomplete.js';
import '../UI/playlists.js';
import '../UI/public-playlist.js';
import '../UI/avatar_actions_toggle.ts';
import '../UI/theme_toggle.ts';

// Утилиты
import '../utils/utils.js';
import '../UI/now_playing.ts';

// Favorite Button
import '../UI/favorite-button.js';

/**
 * Восстановление глобального контракта.
 *
 * `Utils` — top-level `const` в utils.js (в классическом скрипте это был global;
 * см. docs/frontend-global-contract.md). В ESM-бандле он изолирован в модуле,
 * поэтому для потребителей, которые ссылаются на `Utils` без `window.`,
 * привязываем его к глобалу явно. Файл utils.js дополнительно выполняет
 * `window.Utils = Utils;` при импорте (см. конец utils.js).
 */
globalThis.Utils = window.Utils;
