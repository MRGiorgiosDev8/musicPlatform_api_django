// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import wikipediaModal from '../../../static/js/features/artist_wikipedia_modal.ts';

export const initArtistWikipediaModal = wikipediaModal.initArtistWikipediaModal;
export const normalizeArtistKey = wikipediaModal.normalizeArtistKey;
export const fallbackWikipediaPayload = wikipediaModal.fallbackWikipediaPayload;
export const createWikipediaArtistBatcher = wikipediaModal.createWikipediaArtistBatcher;
