interface EditorialTranslationRoot {
  root: HTMLElement;
  cacheKey: string;
}

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
  quotaFinished?: boolean;
}

interface CachedEditorialTranslation {
  source: string;
  translated: string;
}

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const TRANSLATION_SEPARATOR = '___RUBYSOUND_EDITORIAL_TRANSLATION_SEPARATOR_9f3a2c___';
const MAX_QUERY_BYTES = 500;
const translationCache = new Map<string, Map<string, CachedEditorialTranslation>>();
const translatedNodes = new WeakMap<Text, CachedEditorialTranslation>();

const getTextNodesInsideParagraphs = (root: HTMLElement): Text[] => {
  const paragraphs = root.matches('p')
    ? [root]
    : Array.from(root.querySelectorAll<HTMLElement>('p'));
  const textNodes: Text[] = [];

  paragraphs.forEach((paragraph) => {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
      const textNode = currentNode as Text;
      const parentLink = textNode.parentElement?.closest('a');
      if (textNode.textContent?.trim() && !parentLink) textNodes.push(textNode);
      currentNode = walker.nextNode();
    }
  });

  return textNodes;
};

const getCache = (cacheKey: string): Map<string, CachedEditorialTranslation> => {
  const existing = translationCache.get(cacheKey);
  if (existing) return existing;
  const created = new Map<string, CachedEditorialTranslation>();
  translationCache.set(cacheKey, created);
  return created;
};

const showTranslationNotice = (notice: HTMLElement | null, message: string): void => {
  if (!notice) return;
  notice.textContent = message;
  notice.removeAttribute('hidden');
};

const requestTranslation = async (source: string): Promise<string[] | null> => {
  const params = new URLSearchParams({
    q: source,
    langpair: 'en|ru',
  });
  const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`MyMemory request failed: ${response.status}`);

  const data = (await response.json()) as MyMemoryResponse;
  if (data.quotaFinished === true) return null;

  const translatedText = data.responseData?.translatedText;
  if (typeof translatedText !== 'string') throw new Error('MyMemory returned no translation');
  return translatedText.split(TRANSLATION_SEPARATOR);
};

const getUtf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

const splitIntoBatches = (sources: string[]): string[][] => {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;
  const separatorBytes = getUtf8ByteLength(TRANSLATION_SEPARATOR);

  sources.forEach((source) => {
    const sourceBytes = getUtf8ByteLength(source);
    const nextBytes = current.length
      ? currentBytes + separatorBytes + sourceBytes
      : sourceBytes;

    if (current.length && nextBytes > MAX_QUERY_BYTES) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }

    if (sourceBytes <= MAX_QUERY_BYTES) {
      current.push(source);
      currentBytes = current.length
        ? currentBytes + (current.length > 1 ? separatorBytes : 0) + sourceBytes
        : sourceBytes;
    } else {
      console.warn('[editorial translation] text node exceeds MyMemory 500-byte limit', {
        bytes: sourceBytes,
      });
    }
  });

  if (current.length) batches.push(current);
  return batches;
};

export const translateEditorialRoots = async (
  roots: EditorialTranslationRoot[],
  notice: HTMLElement | null = null
): Promise<void> => {
  const nodesByKey = new Map<string, Text[]>();
  roots.forEach(({ root, cacheKey }) => {
    const nodes = nodesByKey.get(cacheKey) || [];
    nodes.push(...getTextNodesInsideParagraphs(root));
    nodesByKey.set(cacheKey, nodes);
  });

  const pendingNodes: Array<{ node: Text; cacheKey: string; source: string }> = [];
  const pendingSources: string[] = [];
  const pendingSourceSet = new Set<string>();

  nodesByKey.forEach((nodes, cacheKey) => {
    const cache = getCache(cacheKey);
    nodes.forEach((node) => {
      const source = node.textContent || '';
      const nodeTranslation = translatedNodes.get(node);
      if (nodeTranslation?.translated === source) return;
      const cached = cache.get(source);
      if (cached) {
        node.textContent = cached.translated;
        translatedNodes.set(node, cached);
        return;
      }

      pendingNodes.push({ node, cacheKey, source });
      if (!pendingSourceSet.has(source)) {
        pendingSourceSet.add(source);
        pendingSources.push(source);
      }
    });
  });

  if (!pendingSources.length) return;

  const translatedBySource = new Map<string, string>();
  for (const batchSources of splitIntoBatches(pendingSources)) {
    try {
      const translatedParts = await requestTranslation(batchSources.join(TRANSLATION_SEPARATOR));
      if (translatedParts === null) {
        showTranslationNotice(notice, 'Translation limit reached. Try again later.');
        return;
      }
      if (translatedParts.length !== batchSources.length) {
        console.warn('[editorial translation] response separator count mismatch', {
          sourceCount: batchSources.length,
          translatedPartCount: translatedParts.length,
        });
        continue;
      }

      batchSources.forEach((source, index) => {
        translatedBySource.set(source, translatedParts[index]);
      });
    } catch (error) {
      console.warn('[editorial translation] request failed', error);
    }
  }

  pendingNodes.forEach(({ node, cacheKey, source }) => {
    const translated = translatedBySource.get(source);
    if (translated === undefined) return;
    const cached = { source, translated };
    getCache(cacheKey).set(source, cached);
    translatedNodes.set(node, cached);
    node.textContent = translated;
  });
};

export const getEditorialTranslationKey = (
  item: { id?: string; guid?: string; source_url?: string; url?: string; link?: string; title?: string },
  fallback = 'unknown'
): string =>
  item.id || item.guid || item.source_url || item.url || item.link || item.title || fallback;
