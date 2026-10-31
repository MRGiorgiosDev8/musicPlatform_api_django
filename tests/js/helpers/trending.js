// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const trendingModule = require('../../../static/js/features/trending.js');

export const TrendingApp = trendingModule.TrendingApp;
export const buildTrendingUrl = trendingModule.buildTrendingUrl;
export const extractTrendingArtists = trendingModule.extractTrendingArtists;