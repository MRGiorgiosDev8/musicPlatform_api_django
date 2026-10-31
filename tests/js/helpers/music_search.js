// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const musicSearch = require('../../../static/js/features/music_search.js');

export const TREND_CACHE_TTL = musicSearch.TREND_CACHE_TTL;
export const escapeHtml = musicSearch.escapeHtml;
export const getCachedTrend = musicSearch.getCachedTrend;
export const setCachedTrend = musicSearch.setCachedTrend;
export const parseListeners = musicSearch.parseListeners;
export const getTrackPopularity = musicSearch.getTrackPopularity;
export const normalizeArtist = musicSearch.normalizeArtist;
export const prepareTracks = musicSearch.prepareTracks;