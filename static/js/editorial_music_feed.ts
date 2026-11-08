interface EditorialMusicItem {
  id?: string;
  title?: string;
  guid?: string;
  summary?: string;
  source_url?: string;
  link?: string;
  image_url?: string | null;
  cover_url?: string | null;
  url?: string;
  artist?: string | null;
  release?: string | null;
  published_at?: string;
  rating?: number | string | null;
  source?: string;
  source_name?: string;
  creator?: string;
  category?: string;
}

interface EditorialMusicResponse {
  results?: EditorialMusicItem[];
}

interface EditorialArticleResponse {
  title?: string;
  published_at?: string;
  source_url?: string;
  html?: string;
}

const EDITORIAL_MUSIC_URL = '/music_api/editorial/music/';
const EDITORIAL_ARTICLE_URL = '/music_api/editorial/article/';

const formatPublishedAt = (value: string | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-RU');
};

const createText = (tagName: string, className: string, value: string): HTMLElement => {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = value;
  return element;
};

const setArticleCanonical = (sourceUrl: string): (() => void) => {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const originalHref = existing?.href || null;
  const canonical = existing || document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = sourceUrl;
  if (!existing) document.head.appendChild(canonical);

  return () => {
    if (existing && originalHref) {
      existing.href = originalHref;
    } else if (!existing) {
      canonical.remove();
    }
  };
};

const renderArticleHtml = (container: HTMLElement, html: string): void => {
  const parsed = new DOMParser().parseFromString(html || '', 'text/html');
  parsed
    .querySelectorAll('script, style, object, embed, form, iframe')
    .forEach((node) => node.remove());
  const fragment = document.createDocumentFragment();
  Array.from(parsed.body.childNodes).forEach((node) => {
    fragment.appendChild(document.importNode(node, true));
  });
  container.replaceChildren(fragment);
};

const showArticleError = (sourceUrl: string): void => {
  const error = document.getElementById('editorialArticleError');
  if (!error) return;
  const link = document.createElement('a');
  link.href = sourceUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'alert-link d-block mt-2';
  link.textContent = 'Открыть рецензию на Pitchfork';
  error.replaceChildren(
    document.createTextNode('Не удалось загрузить полный текст рецензии.'),
    link
  );
  error.removeAttribute('hidden');
};

const openEditorialReview = async (item: EditorialMusicItem): Promise<void> => {
  const sourceUrl = item.source_url || item.url || item.link;
  const modalElement = document.getElementById('editorialArticleModal');
  if (!sourceUrl || !modalElement || typeof bootstrap === 'undefined' || !bootstrap.Modal) return;

  const title = document.getElementById('editorialArticleModalTitle');
  const meta = document.getElementById('editorialArticleMeta');
  const summary = document.getElementById('editorialArticleSummary');
  const articleHtml = document.getElementById('editorialArticleHtml');
  const loading = document.getElementById('editorialArticleLoading');
  const error = document.getElementById('editorialArticleError');
  const original = document.getElementById('editorialArticleOriginal') as HTMLAnchorElement | null;
  if (!title || !meta || !summary || !articleHtml || !loading || !error || !original) return;

  const restoreCanonical = setArticleCanonical(sourceUrl);
  modalElement.addEventListener('hidden.bs.modal', restoreCanonical, { once: true });
  title.textContent = item.title || 'Рецензия Pitchfork';
  meta.textContent = [formatPublishedAt(item.published_at), item.source_name || 'Pitchfork']
    .filter(Boolean)
    .join(' · ');
  summary.textContent = item.summary || '';
  original.href = sourceUrl;
  articleHtml.replaceChildren();
  error.setAttribute('hidden', '');
  loading.removeAttribute('hidden');

  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();

  try {
    const data = (await Utils.fetchData(
      `${EDITORIAL_ARTICLE_URL}?url=${encodeURIComponent(sourceUrl)}`
    )) as EditorialArticleResponse;
    title.textContent = data.title || item.title || 'Рецензия Pitchfork';
    meta.textContent = [formatPublishedAt(data.published_at), item.source_name || 'Pitchfork']
      .filter(Boolean)
      .join(' · ');
    original.href = data.source_url || sourceUrl;
    renderArticleHtml(articleHtml, data.html || '');
  } catch {
    showArticleError(sourceUrl);
  } finally {
    loading.setAttribute('hidden', '');
  }
};

const createEditorialCard = (item: EditorialMusicItem): HTMLElement => {
  const column = document.createElement('div');
  column.className = 'col';
  const sourceUrl = item.source_url || item.url || item.link;

  const card = document.createElement('article');
  card.className = 'card h-100 rounded-sm card-custom';
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.addEventListener('click', () => void openEditorialReview(item));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openEditorialReview(item);
    }
  });

  const coverUrl = item.cover_url || item.image_url;
  if (coverUrl) {
    const image = document.createElement('img');
    image.src = coverUrl;
    image.alt = item.release || item.title || 'Обложка альбома';
    image.className = 'card-img-top img-fluid';
    image.loading = 'lazy';
    image.onerror = () => {
      image.replaceWith(
        createText('div', 'card-img-top text-muted text-center py-5', 'Обложка недоступна')
      );
    };
    card.appendChild(image);
  } else {
    card.appendChild(
      createText('div', 'card-img-top text-muted text-center py-5', 'Обложка недоступна')
    );
  }

  const body = document.createElement('div');
  body.className = 'card-body d-flex flex-column';
  body.appendChild(createText('h2', 'card-title h5 text-body', item.title || 'Без названия'));
  body.appendChild(createText('p', 'card-text text-body', item.summary || ''));

  if (item.rating !== null && item.rating !== undefined && item.rating !== '') {
    body.appendChild(createText('small', 'text-muted mb-2', `Оценка: ${item.rating}`));
  }

  body.appendChild(
    createText(
      'small',
      'text-muted mt-auto mb-3',
      [formatPublishedAt(item.published_at), item.source_name || 'Pitchfork']
        .filter(Boolean)
        .join(' · ')
    )
  );

  if (sourceUrl) {
    const link = document.createElement('a');
    link.className = 'btn btn-danger rounded-2 align-self-start';
    link.href = sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Открыть рецензию на Pitchfork';
    link.addEventListener('click', (event) => event.stopPropagation());
    body.appendChild(link);
  }

  card.appendChild(body);
  column.appendChild(card);
  return column;
};

const renderEditorialMusic = (items: EditorialMusicItem[]): void => {
  const container = document.getElementById('editorial-music-container');
  if (!container) return;

  container.replaceChildren();
  if (!items.length) {
    Utils.renderEmpty('editorial-music-container');
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createEditorialCard(item)));
  container.appendChild(fragment);
};

const loadEditorialMusic = async (): Promise<void> => {
  const spinner = document.getElementById('editorial-music-spinner');
  spinner?.removeAttribute('hidden');

  try {
    const data = (await Utils.fetchData(EDITORIAL_MUSIC_URL)) as EditorialMusicResponse;
    renderEditorialMusic(Array.isArray(data.results) ? data.results : []);
  } catch {
    Utils.showError('editorial-music-container');
  } finally {
    spinner?.setAttribute('hidden', '');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('editorial-music-container')) {
    void loadEditorialMusic();
  }
});
