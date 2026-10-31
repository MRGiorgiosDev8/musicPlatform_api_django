/**
 * Единый источник правды для генерации legacy-JS из TS-источников.
 *
 * legacyOptions повторяет параметры прежней CLI-сборки hamburger_animation
 * (esbuild `--bundle --format=iife` + дефолты platform/target/minify), чтобы
 * рефакторинг инфраструктуры не изменил вывод.
 */
export const LEGACY_MODULES = [
  'static/js/animation/hamburger_animation.ts',
  'static/js/UI/avatar_actions_toggle.ts',
  'static/js/UI/clear_search_button.ts',
  'static/js/UI/search_button_scroll.ts',
  'static/js/UI/theme_toggle.ts',
  'static/js/pwa/register.ts',
  'static/js/features/realtime_notifications.ts',
  'static/js/features/realtime_presence.ts',
  'static/js/features/public_playlists_dashboard.ts',
  'static/js/UI/now_playing.ts',
  'static/js/animation/auth_widget_animation.ts',
  'static/js/animation/profile_stagger_animation.ts',
  'static/js/animation/public_profile_stagger_animation.ts',
];

export const legacyOutfile = (source) => source.replace(/\.ts$/, '.js');

export const legacyOptions = (source) => ({
  entryPoints: [source],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'esnext',
  minify: false,
  outfile: legacyOutfile(source),
});
