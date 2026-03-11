(() => {
  const searchForm = document.querySelector('.form-search');
  const searchInput = document.getElementById('search-query');
  if (!searchForm || !searchInput) return;

  const wrapper = searchInput.closest('.position-relative');
  if (!wrapper) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-autocomplete';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  const list = document.createElement('ul');
  list.className = 'search-autocomplete-list';
  dropdown.appendChild(list);
  wrapper.appendChild(dropdown);

  const cache = new Map();
  const TREND_CACHE_TTL = 10 * 60 * 1000;
  let abortController = null;
  const AbortCtrl = window.AbortController || null;
  let activeIndex = -1;
  let currentItems = [];

  const normalizeQuery = (value) => value.trim();
  const normalizeText = (value) =>
    String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const escapeHtml = (unsafe) =>
    String(unsafe ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

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

  const setActiveIndex = (idx) => {
    activeIndex = idx;
    list.querySelectorAll('.search-autocomplete-item').forEach((item, i) => {
      item.classList.toggle('is-active', i === activeIndex);
    });
  };

  const buildItems = (rows, query) => {
    const items = [];
    const normalizedQuery = normalizeText(query);
    const artists = [];
    const seen = new Set();

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

    let filtered = normalizedQuery
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

  const getCachedSearch = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const { ts, data } = JSON.parse(raw);
      return Date.now() - ts > TREND_CACHE_TTL ? null : data;
    } catch {
      return null;
    }
  };

  const renderItems = (items) => {
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

  const fetchSuggestions = async (query) => {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) {
      hideDropdown();
      return;
    }

    if (cache.has(normalized)) {
      renderItems(cache.get(normalized));
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
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

      const items = buildItems(results, normalized);
      cache.set(normalized, items);
      renderItems(items);
    } catch (error) {
      if (error.name === 'AbortError') return;
      hideDropdown();
    }
  };

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const value = searchInput.value;
    debounceTimer = setTimeout(() => fetchSuggestions(value), 220);
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
    if (!wrapper.contains(event.target)) hideDropdown();
  });
})();
