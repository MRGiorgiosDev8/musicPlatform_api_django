// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// исходники не содержат `export`, поэтому грузим их через CJS-мост
// и реэкспортируем именованные привязки для тестов.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const wikipediaModal = require('../../../static/js/features/artist_wikipedia_modal.js');

export const initArtistWikipediaModal = wikipediaModal.initArtistWikipediaModal;
export const normalizeArtistKey = wikipediaModal.normalizeArtistKey;
export const fallbackWikipediaPayload = wikipediaModal.fallbackWikipediaPayload;
export const createWikipediaArtistBatcher = wikipediaModal.createWikipediaArtistBatcher;