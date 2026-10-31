// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const playlists = require('../../../static/js/UI/playlists.js');

export const normalizePlaylistArtist = playlists.normalizePlaylistArtist;
export const buildTrackRecords = playlists.buildTrackRecords;
export const computePlaylistView = playlists.computePlaylistView;