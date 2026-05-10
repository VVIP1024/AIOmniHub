interface ArticleImageResult {
  image: string | null;
  cached: boolean;
}

interface ArticleImageCacheEntry {
  expiresAt: number;
  image: string | null;
}

interface ArticleImageResolverOptions {
  cacheTtlMs?: number;
  delay?: (ms: number) => Promise<void>;
  fetchHtml?: (url: string) => Promise<string>;
  intervalMs?: number;
  now?: () => number;
}

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60;
const DEFAULT_FETCH_INTERVAL_MS = 3000;
const ARTICLE_IMAGE_USER_AGENT = 'AIOmniHub/1.0 (+article-image-resolver)';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArticleHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'User-Agent': ARTICLE_IMAGE_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  return response.text();
}

function getAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim() || null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractArticleImage(html: string, baseUrl: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const imageProperties = new Set(['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src', 'image']);

  for (const tag of metaTags) {
    const key = getAttribute(tag, 'property') ?? getAttribute(tag, 'name');
    if (!key || !imageProperties.has(key.toLowerCase())) continue;

    const content = getAttribute(tag, 'content');
    if (!content) continue;

    try {
      return new URL(decodeHtmlEntities(content), baseUrl).toString();
    } catch {
      continue;
    }
  }

  return null;
}

export function createArticleImageResolver(options: ArticleImageResolverOptions = {}) {
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const delay = options.delay ?? sleep;
  const fetchHtml = options.fetchHtml ?? fetchArticleHtml;
  const intervalMs = options.intervalMs ?? DEFAULT_FETCH_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, ArticleImageCacheEntry>();
  const inflight = new Map<string, Promise<ArticleImageResult>>();
  let queue = Promise.resolve();
  let nextFetchAt = 0;

  return async function resolveArticleImage(url: string): Promise<ArticleImageResult> {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > now()) {
      return {
        image: cached.image,
        cached: true,
      };
    }

    const existing = inflight.get(url);
    if (existing) return existing;

    const request = queue.then(async () => {
      const waitMs = Math.max(0, nextFetchAt - now());
      if (waitMs > 0) {
        await delay(waitMs);
      }

      const html = await fetchHtml(url);
      nextFetchAt = now() + intervalMs;
      const image = extractArticleImage(html, url);
      cache.set(url, {
        expiresAt: now() + cacheTtlMs,
        image,
      });

      return {
        image,
        cached: false,
      };
    });

    queue = request.then(
      () => undefined,
      () => undefined,
    );
    inflight.set(url, request);

    try {
      return await request;
    } finally {
      inflight.delete(url);
    }
  };
}

export const resolveArticleImage = createArticleImageResolver();
