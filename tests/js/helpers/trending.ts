// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import * as trendingModule from '../../../static/js/features/trending.ts';

declare module '../../../static/js/features/trending.ts' {
  export const TrendingApp: any;
  export const buildTrendingUrl: any;
  export const extractTrendingArtists: any;
}

export const TrendingApp = trendingModule.TrendingApp;
export const buildTrendingUrl = trendingModule.buildTrendingUrl;
export const extractTrendingArtists = trendingModule.extractTrendingArtists;
