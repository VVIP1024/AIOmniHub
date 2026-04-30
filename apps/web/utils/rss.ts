import { get } from '@vercel/edge-config';
import Parser from 'rss-parser';

export type Category =
  | 'AI Strategy'
  | 'Tech Trends'
  | 'Policy & Regulation'
  | 'Ethics & Governance'
  | 'Research & Data'
  | 'Blog';

type RssCategory = Exclude<Category, 'Blog'>;

export interface FeedSource {
  name: string;
  url: string;
}

export interface CategoryInsight {
  category: Category;
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string;
  image: string;
  readTime: string;
  tags?: string[];
}

type ExtendedItem = Parser.Item & {
  'content:encoded'?: string;
  'media:content'?: Array<{ $?: { url?: string } }>;
};

export type HomepageInsights = Record<Category, CategoryInsight[]>;

const EDGE_CONFIG_KEYS: Record<RssCategory, string> = {
  'AI Strategy': 'AI-Strategy',
  'Tech Trends': 'Tech-Trends',
  'Policy & Regulation': 'Policy-Regulation',
  'Ethics & Governance': 'Ethics-Governance',
  'Research & Data': 'Research-Data',
};

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AIOmniHub/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
});

const CATEGORY_ORDER: RssCategory[] = [
  'AI Strategy',
  'Tech Trends',
  'Policy & Regulation',
  'Ethics & Governance',
  'Research & Data',
];

const DEFAULT_IMAGES: Record<Category, string> = {
  'AI Strategy':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBkc7b2xaKjr3qaZtdOOljyB6gnyk8oZRutoNh6NUeOMoJQzMNVukPxB7ZV-SNnGWtGB1RZZ7U6U5FlcttQSuHMatvHpGuijaM-IqVQu9jPZ6HBp5QhYm3tFx_S6tcnmDid6-ZP2TKlemxaBER5av3dVLA6lbwLIgtPjSdEZmqe62tDa6iTCU0CeDPy21mCRSlFltVzK3BWrt2fNe38n9EIP0IIiPJPXa_wwTvakMJB8DSwM_JVzoSQA0ea0W9Qr3HjxsSBorkb0R0',
  'Tech Trends':
    'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=1600&q=80',
  'Policy & Regulation':
    'https://images.unsplash.com/photo-1568030002456-4f6e6f405ee0?auto=format&fit=crop&w=1600&q=80',
  'Ethics & Governance':
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1600&q=80',
  'Research & Data':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCCtre3nBxfKjyzjtISH7TUTLf00qAnoiQYNIhX5dU-Q-q_hoMFHc4_irOm2iFzKMjy_yYcWPTKIkiQJoi9EUNw9zJrvWA8jNvqdGwOzPYIo7PTLMOrsAfFf9f9TdmuNYR3THRw8bUEveMBxFEdFZH9AU6b58ebExbmAR_F8sEP7lgkTZZ3PrBIo0zjLs2cVHwtb5lXdyot6ajcudAiR8CBDebbXCSJB02WHPQG9IuBSXPs85DWaysx9Ps2tBOagZXQqxRMa2x3lFI',
  Blog:
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80',
};

function isCategory(value: string): value is Category {
  return [...CATEGORY_ORDER, 'Blog'].includes(value as Category);
}

function sanitizeFeedSources(value: unknown): FeedSource[] | null {
  if (!Array.isArray(value)) return null;

  return value.filter(
    (item): item is FeedSource =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as FeedSource).name === 'string' &&
      typeof (item as FeedSource).url === 'string',
  );
}

function mapDashedSourceConfig(parsed: Record<string, unknown>): Record<RssCategory, FeedSource[]> | null {
  const mapped: Partial<Record<RssCategory, FeedSource[]>> = {};

  for (const category of CATEGORY_ORDER) {
    const cleaned = sanitizeFeedSources(parsed[EDGE_CONFIG_KEYS[category]]);
    if (cleaned === null) return null;
    mapped[category] = cleaned;
  }

  return mapped as Record<RssCategory, FeedSource[]>;
}

function mapCategorySourceConfig(parsed: Record<string, unknown>): Record<RssCategory, FeedSource[]> | null {
  const mapped: Partial<Record<RssCategory, FeedSource[]>> = {};

  for (const category of CATEGORY_ORDER) {
    const cleaned = sanitizeFeedSources(parsed[category]);
    if (cleaned === null) return null;
    mapped[category] = cleaned;
  }

  return mapped as Record<RssCategory, FeedSource[]>;
}

async function getSourcesFromEdgeConfig(): Promise<Record<RssCategory, FeedSource[]> | null> {
  try {
    const entries = await Promise.all(
      CATEGORY_ORDER.map(async (category) => [category, await get(EDGE_CONFIG_KEYS[category])] as const),
    );

    const mapped: Partial<Record<RssCategory, FeedSource[]>> = {};
    for (const [category, value] of entries) {
      const cleaned = sanitizeFeedSources(value);
      if (cleaned === null) return null;
      mapped[category] = cleaned;
    }

    return mapped as Record<RssCategory, FeedSource[]>;
  } catch {
    return null;
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(4, Math.min(12, Math.round(words / 180) || 4));
  return `${minutes} MIN READ`;
}

function extractImage(item: ExtendedItem): string | null {
  const enclosureUrl = (item.enclosure as { url?: string } | undefined)?.url;
  if (enclosureUrl) return enclosureUrl;

  const mediaContent = item['media:content'];
  const mediaUrl = mediaContent?.[0]?.$?.url;
  if (mediaUrl) return mediaUrl;

  const content = item.content ?? item['content:encoded'] ?? '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] ?? null;
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

async function fetchCategoryInsights(
  category: RssCategory,
  sources: FeedSource[],
  limit = 8,
): Promise<CategoryInsight[]> {
  const candidates: CategoryInsight[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items ?? []) {
        const typedItem = item as ExtendedItem;
        const title = (typedItem.title ?? '').trim();
        const link = (typedItem.link ?? '').trim();
        if (!title || !link) continue;

        const rawSummary =
          typedItem.contentSnippet ??
          typedItem.summary ??
          typedItem.content ??
          typedItem['content:encoded'] ??
          'No summary available';
        const summary = truncate(stripHtml(rawSummary), 180);
        const publishedAt = typedItem.isoDate ?? typedItem.pubDate ?? '';

        candidates.push({
          category,
          title,
          summary,
          link,
          source: source.name,
          publishedAt,
          image: extractImage(typedItem) ?? DEFAULT_IMAGES[category],
          readTime: estimateReadTime(summary),
        });
      }
    } catch {
      continue;
    }
  }

  if (candidates.length === 0) return [];

  const seen = new Set<string>();
  candidates.sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt));
  const unique = candidates.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  return unique.slice(0, limit);
}

export async function getHomepageInsights(): Promise<HomepageInsights> {
  const sources = await getSourcesFromEdgeConfig();
  if (!sources) {
    const emptyInsights: HomepageInsights = {
      'AI Strategy': [],
      'Tech Trends': [],
      'Policy & Regulation': [],
      'Ethics & Governance': [],
      'Research & Data': [],
      Blog: [],
    };

    return emptyInsights;
  }

  const results = await Promise.all(
    CATEGORY_ORDER.map(
      async (category) => [category, await fetchCategoryInsights(category, sources[category])] as const,
    ),
  );

  const rssInsights = Object.fromEntries(results) as Record<RssCategory, CategoryInsight[]>;
  const insights: HomepageInsights = {
    ...rssInsights,
    Blog: [],
  };
  return insights;
}

export const categoryOrder: Category[] = CATEGORY_ORDER;
