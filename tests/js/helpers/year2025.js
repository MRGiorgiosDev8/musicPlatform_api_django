// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const yearModule = require('../../../static/js/features/year2025.js');

export const Year2025App = yearModule.Year2025App;
export const buildYearChartUrl = yearModule.buildYearChartUrl;
export const extractYearTracks = yearModule.extractYearTracks;
export const hasAudioPreview = yearModule.hasAudioPreview;
export const resolveTrackPlaycount = yearModule.resolveTrackPlaycount;