// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const publicPlaylist = require('../../../static/js/UI/public-playlist.js');

export const initPublicPlaylistPage = publicPlaylist.initPublicPlaylistPage;
export const resolvePublicPlaylistViewMode = publicPlaylist.resolvePublicPlaylistViewMode;
export const getPublicPlaylistViewStorageKey = publicPlaylist.getPublicPlaylistViewStorageKey;
export const computePublicPlaylistPagination = publicPlaylist.computePublicPlaylistPagination;