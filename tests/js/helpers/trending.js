// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import trendingModule from '../../../static/js/features/trending.ts';

export const TrendingApp = trendingModule.TrendingApp;
export const buildTrendingUrl = trendingModule.buildTrendingUrl;
export const extractTrendingArtists = trendingModule.extractTrendingArtists;
