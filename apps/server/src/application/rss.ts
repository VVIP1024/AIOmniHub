import { get } from '@vercel/edge-config';
import fs from 'fs/promises';
import Parser from 'rss-parser';
import { getLocalStoragePath, shouldUseVercelStorage } from '../config/storage-env.js';
import type { Category, CategoryInsight, FeedSource, HomepageInsights, RssCategory } from '../types.js';

type ExtendedItem = Parser.Item & {
  'content:encoded'?: string;
  'media:content'?: Array<{ $?: { url?: string } }>;
};

export const categoryOrder: Category[] = [
  'AI Strategy',
  'Tech Trends',
  'Policy & Regulation',
  'Ethics & Governance',
  'Research',
  'Developer Forum',
  'Blog',
];

const CATEGORY_ORDER = categoryOrder as RssCategory[];

const EDGE_CONFIG_KEYS: Record<RssCategory, string> = {
  'AI Strategy': 'AI-Strategy',
  'Tech Trends': 'Tech-Trends',
  'Policy & Regulation': 'Policy-Regulation',
  'Ethics & Governance': 'Ethics-Governance',
  'Research': 'Research',
  'Developer Forum': 'Developer-Forum',
  'Blog': 'Blog',
};

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AIOmniHub/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
});

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

async function getSourcesFromLocalEdgeConfig(): Promise<Record<RssCategory, FeedSource[]> | null> {
  try {
    const rawConfig = await fs.readFile(getLocalStoragePath('edge', 'config.json'), 'utf8');
    return mapDashedSourceConfig(JSON.parse(rawConfig) as Record<string, unknown>);
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
  return `${text.slice(0, max - 1).trim()}...`;
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(4, Math.min(12, Math.round(words / 180) || 4));
  return `${minutes} MIN READ`;
}

function extractImage(item: ExtendedItem): string | null {
  const enclosureUrl = (item.enclosure as { url?: string } | undefined)?.url;
  if (enclosureUrl) return enclosureUrl;

  const mediaUrl = item['media:content']?.[0]?.$?.url;
  if (mediaUrl) return mediaUrl;

  const content = item.content ?? item['content:encoded'] ?? '';
  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

async function fetchCategoryInsights(category: RssCategory, sources: FeedSource[], limit = 8): Promise<CategoryInsight[]> {
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
        candidates.push({
          category,
          title,
          summary,
          link,
          source: source.name,
          publishedAt: typedItem.isoDate ?? typedItem.pubDate ?? '',
          image: extractImage(typedItem) ?? '',
          readTime: estimateReadTime(summary),
        });
      }
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  candidates.sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt));
  return candidates
    .filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    })
    .slice(0, limit);
}

export async function getRssHomepageInsights(): Promise<Omit<HomepageInsights, 'Blog'>> {
  const sources = shouldUseVercelStorage() ? await getSourcesFromEdgeConfig() : await getSourcesFromLocalEdgeConfig();

  if (!sources) {
    return {
      'AI Strategy': [],
      'Tech Trends': [],
      'Policy & Regulation': [],
      'Ethics & Governance': [],
      'Research': [],
    };
  }

  const results = await Promise.all(
    CATEGORY_ORDER.map(async (category) => [category, await fetchCategoryInsights(category, sources[category])] as const),
  );

  return Object.fromEntries(results) as Omit<HomepageInsights, 'Blog'>;
}
