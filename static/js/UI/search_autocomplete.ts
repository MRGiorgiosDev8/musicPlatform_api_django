/**
 * Автодополнение поиска артистов.
 *
 * Инициализируется немедленно при загрузке (script в конце body): читает DOM
 * (.form-search / #search-query), вешает listeners, рендерит dropdown, ходит за
 * подсказками в /music_api/search/artists/. В window ничего не пишет.
 *
 * Чистые хелперы (normalizeText, escapeHtml, buildItems) вынесены на верхний
 * уровень и отдаются через CJS-мост module.exports — в esbuild-IIFE и в
 * Vite-бандле они остаются локальными (не глобальными), как и в исходном IIFE.
 * ESM-экспортов намеренно нет.
 */

interface ArtistSuggestion {
  name: string;
  norm: string;
  listeners: number;
}

interface SearchAutocompleteItem {
  type: 'artist';
  label: string;
  value: string;
}

interface SearchRow {
  name?: string;
  artist?: string;
  listeners?: number | string;
}

const normalizeQuery = (value: string): string => value.trim();

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const escapeHtml = (unsafe: unknown): string =>
  String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildItems = (rows: SearchRow[], query: string): SearchAutocompleteItem[] => {
  const items: SearchAutocompleteItem[] = [];
  const normalizedQuery = normalizeText(query);
  const artists: ArtistSuggestion[] = [];
  const seen = new Set<string>();

  rows.forEach((row) => {
    if (!row) return;
    const artist =
      row.name && !row.artist ? String(row.name || '').trim() : String(row.artist || '').trim();
    if (!artist) return;
    const norm = normalizeText(artist);
    if (seen.has(norm)) return;
    seen.add(norm);
    artists.push({
      name: artist,
      norm,
      listeners: Number(row.listeners || 0),
    });
  });

  let filtered: ArtistSuggestion[] = normalizedQuery
    ? artists.filter((artist) => artist.norm.startsWith(normalizedQuery))
    : artists;

  if (!filtered.length && normalizedQuery) {
    filtered = artists.filter((artist) => artist.norm.includes(normalizedQuery));
  }

  filtered
    .sort((a, b) => {
      const aStarts = normalizedQuery && a.norm.startsWith(normalizedQuery);
      const bStarts = normalizedQuery && b.norm.startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      if (a.listeners !== b.listeners) return b.listeners - a.listeners;
      return a.name.length - b.name.length;
    })
    .forEach((artist) => {
      items.push({ type: 'artist', label: artist.name, value: artist.name });
    });

  return items.slice(0, 8);
};

(() => {
  const searchForm = document.querySelector<HTMLFormElement>('.form-search');
  const searchInput = document.getElementById('search-query') as HTMLInputElement | null;
  if (!searchForm || !searchInput) return;

  const wrapper = searchInput.closest<HTMLElement>('.position-relative');
  if (!wrapper) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-autocomplete';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  const list = document.createElement('ul');
  list.className = 'search-autocomplete-list';
  dropdown.appendChild(list);
  wrapper.appendChild(dropdown);

  const cache = new Map<string, SearchAutocompleteItem[]>();
  const TREND_CACHE_TTL = 10 * 60 * 1000;
  let abortController: AbortController | null = null;
  const AbortCtrl: typeof AbortController | null = window.AbortController || null;
  let activeIndex = -1;
  let currentItems: SearchAutocompleteItem[] = [];

  const hideDropdown = () => {
    dropdown.classList.remove('is-open');
    const delay = 220;
    setTimeout(() => {
      if (!dropdown.classList.contains('is-open')) {
        dropdown.hidden = true;
        list.replaceChildren();
        activeIndex = -1;
        currentItems = [];
      }
    }, delay);
  };

  const showDropdown = () => {
    if (!currentItems.length) {
      hideDropdown();
      return;
    }
    dropdown.hidden = false;
    requestAnimationFrame(() => dropdown.classList.add('is-open'));
  };

  const setActiveIndex = (idx: number) => {
    activeIndex = idx;
    list.querySelectorAll('.search-autocomplete-item').forEach((item, i) => {
      item.classList.toggle('is-active', i === activeIndex);
    });
  };

  const getCachedSearch = (key: string): SearchRow[] | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const { ts, data } = JSON.parse(raw) as { ts: number; data: SearchRow[] };
      return Date.now() - ts > TREND_CACHE_TTL ? null : data;
    } catch {
      return null;
    }
  };

  const renderItems = (items: SearchAutocompleteItem[]) => {
    list.replaceChildren();
    currentItems = items;

    if (!items.length) {
      hideDropdown();
      return;
    }

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'search-autocomplete-item';
      li.setAttribute('role', 'option');
      li.dataset.index = String(idx);
      li.innerHTML = `
        <span class="search-autocomplete-label">${escapeHtml(item.label)}</span>
      `;
      li.addEventListener('mousedown', (event) => {
        event.preventDefault();
        searchInput.value = item.value;
        hideDropdown();
        searchForm.requestSubmit();
      });
      list.appendChild(li);
    });

    setActiveIndex(-1);
    showDropdown();
  };

  const fetchSuggestions = async (query: string) => {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) {
      hideDropdown();
      return;
    }

    if (cache.has(normalized)) {
      renderItems(cache.get(normalized)!);
      return;
    }

    const cachedSearch = getCachedSearch(`music_search_${normalized}`);
    if (cachedSearch) {
      const items = buildItems(cachedSearch, normalized);
      cache.set(normalized, items);
      renderItems(items);
      return;
    }

    if (abortController) abortController.abort();
    abortController = AbortCtrl ? new AbortCtrl() : null;

    try {
      const response = await fetch(
        `/music_api/search/artists/?q=${encodeURIComponent(normalized)}`,
        abortController ? { signal: abortController.signal } : undefined
      );
      if (!response.ok) throw new Error('Search failed');
      const data = (await response.json()) as { results?: unknown };
      const results = Array.isArray(data?.results)
        ? (data.results as SearchRow[])
        : Array.isArray(data)
          ? (data as SearchRow[])
          : [];

      const items = buildItems(results, normalized);
      cache.set(normalized, items);
      renderItems(items);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      hideDropdown();
    }
  };

  let debounceTimer: number | undefined;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const value = searchInput.value;
    debounceTimer = window.setTimeout(() => fetchSuggestions(value), 220);
  });

  searchInput.addEventListener('focus', () => {
    const value = searchInput.value;
    if (value.trim().length >= 2) {
      fetchSuggestions(value);
    }
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(hideDropdown, 120);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (dropdown.hidden || !currentItems.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (activeIndex + 1) % currentItems.length;
      setActiveIndex(nextIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
      setActiveIndex(prevIndex);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const item = currentItems[activeIndex];
      if (item) {
        searchInput.value = item.value;
        hideDropdown();
        searchForm.requestSubmit();
      }
    } else if (event.key === 'Escape') {
      hideDropdown();
    }
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target as Node)) hideDropdown();
  });
})();

// CJS-мост: инертен в браузере (module не определён), нужен для CommonJS-загрузки.
// Декларация `module` уже глобальна (favorite-button.ts), повторно не объявляем.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildItems,
    normalizeText,
  };
}
