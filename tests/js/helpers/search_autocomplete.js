// Мост для классических скриптов без ESM-экспортов (Фаза 3.1):
// `search_autocomplete.js` — IIFE, которая при загрузке читает DOM и вешает
// listeners. Тестам нужно пере-исполнение модуля между кейсами, поэтому
// хелпер инкапсулирует сброс кэша CJS (`require.cache`) через функцию.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const SEARCH_AUTOCOMPLETE_SRC = '../../../static/js/UI/search_autocomplete.js';

export const loadSearchAutocomplete = () => {
  const resolved = require.resolve(SEARCH_AUTOCOMPLETE_SRC);
  delete require.cache[resolved];
  return require(SEARCH_AUTOCOMPLETE_SRC);
};