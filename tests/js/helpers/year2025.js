// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import yearModule from '../../../static/js/features/year2025.ts';

export const Year2025App = yearModule.Year2025App;
export const buildYearChartUrl = yearModule.buildYearChartUrl;
export const extractYearTracks = yearModule.extractYearTracks;
export const hasAudioPreview = yearModule.hasAudioPreview;
export const resolveTrackPlaycount = yearModule.resolveTrackPlaycount;
