// Мост для классических скриптов без ESM-экспортов:
// исходник не содержит `export`, поэтому грузим .ts через CJS-interop
// и реэкспортируем именованные привязки для тестов.
import * as wikipediaModal from '../../../static/js/features/artist_wikipedia_modal.ts';

declare module '../../../static/js/features/artist_wikipedia_modal.ts' {
  export const initArtistWikipediaModal: any;
  export const normalizeArtistKey: any;
  export const fallbackWikipediaPayload: any;
  export const createWikipediaArtistBatcher: any;
}

export const initArtistWikipediaModal = wikipediaModal.initArtistWikipediaModal;
export const normalizeArtistKey = wikipediaModal.normalizeArtistKey;
export const fallbackWikipediaPayload = wikipediaModal.fallbackWikipediaPayload;
export const createWikipediaArtistBatcher = wikipediaModal.createWikipediaArtistBatcher;
