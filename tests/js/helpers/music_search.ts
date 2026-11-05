// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import * as musicSearch from '../../../static/js/features/music_search.ts';

declare module '../../../static/js/features/music_search.ts' {
  export const TREND_CACHE_TTL: any;
  export const escapeHtml: any;
  export const getCachedTrend: any;
  export const setCachedTrend: any;
  export const parseListeners: any;
  export const getTrackPopularity: any;
  export const normalizeArtist: any;
  export const prepareTracks: any;
}

export const TREND_CACHE_TTL = musicSearch.TREND_CACHE_TTL;
export const escapeHtml = musicSearch.escapeHtml;
export const getCachedTrend = musicSearch.getCachedTrend;
export const setCachedTrend = musicSearch.setCachedTrend;
export const parseListeners = musicSearch.parseListeners;
export const getTrackPopularity = musicSearch.getTrackPopularity;
export const normalizeArtist = musicSearch.normalizeArtist;
export const prepareTracks = musicSearch.prepareTracks;
