import { get } from '@vercel/edge-config';
import fs from 'fs/promises';
import Parser from 'rss-parser';
import { getLocalStoragePath, shouldUseVercelStorage } from '../config/storage-env.js';
import type {
  Category,
  CategoryInsight,
  FeedSource,
  FeedSourceGroup,
  HomepageInsights,
  HomepageData,
  RssCategory,
  SourceNavigationCategory,
} from '../types.js';

type ExtendedItem = Parser.Item & {
  'content:encoded'?: string;
  'media:content'?: Array<{ $?: { url?: string } }>;
};

interface ParsedFeed {
  items?: ExtendedItem[];
}

interface FetchCategoryInsightsOptions {
  limit?: number;
  logger?: {
    warn: (...args: unknown[]) => void;
  };
  parseFeed?: (url: string) => Promise<ParsedFeed>;
}

export const categoryOrder: Category[] = [
  'AI Strategy',
  'Tech Trends',
  'Policy & Regulation',
  'Ethics & Governance',
  'Research',
  'Developer Forum',
];

const EDGE_CONFIG_KEYS: Record<RssCategory, string> = {
  'AI Strategy': 'AI-Strategy',
  'Tech Trends': 'Tech-Trends',
  'Policy & Regulation': 'Policy-Regulation',
  'Ethics & Governance': 'Ethics-Governance',
  'Research': 'Research',
  'Developer Forum': 'Developer-Forum',
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

function toCategoryKey(key: string): Category {
  const entry = Object.entries(EDGE_CONFIG_KEYS).find(([, edgeKey]) => edgeKey === key);
  return entry?.[0] ?? key.replace(/-/g, ' ');
}

function toEdgeConfigKey(category: Category): string {
  return EDGE_CONFIG_KEYS[category] ?? category.replace(/\s+/g, '-');
}

function sanitizeFeedSourceGroups(value: unknown): FeedSourceGroup[] | null {
  const legacySources = sanitizeFeedSources(value);
  if (legacySources) {
    return [
      {
        sources: legacySources,
      },
    ];
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const groups: FeedSourceGroup[] = [];
  for (const [group, sources] of Object.entries(value as Record<string, unknown>)) {
    const cleaned = sanitizeFeedSources(sources);
    if (cleaned) {
      groups.push({
        group,
        sources: cleaned,
      });
    }
  }

  return groups.length > 0 ? groups : null;
}

export function normalizeSourceConfig(parsed: Record<string, unknown>): {
  navigation: SourceNavigationCategory[];
  sources: Record<RssCategory, FeedSourceGroup[]>;
} {
  const sources: Partial<Record<RssCategory, FeedSourceGroup[]>> = {};
  const navigation: SourceNavigationCategory[] = [];

  for (const [rawCategory, value] of Object.entries(parsed)) {
    const groups = sanitizeFeedSourceGroups(value);
    if (!groups) continue;

    const category = toCategoryKey(rawCategory) as RssCategory;
    sources[category] = groups;
    navigation.push({
      category,
      groups: groups.map((group) => group.group).filter((group): group is string => Boolean(group)),
    });
  }

  return {
    navigation,
    sources: sources as Record<RssCategory, FeedSourceGroup[]>,
  };
}

async function getSourcesFromEdgeConfig(): Promise<ReturnType<typeof normalizeSourceConfig> | null> {
  try {
    const categories = categoryOrder as RssCategory[];
    const entries = await Promise.all(
      categories.map(async (category) => [toEdgeConfigKey(category), await get(toEdgeConfigKey(category))] as const),
    );
    return normalizeSourceConfig(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

async function getSourcesFromLocalEdgeConfig(): Promise<ReturnType<typeof normalizeSourceConfig> | null> {
  try {
    const rawConfig = await fs.readFile(getLocalStoragePath('edge', 'config.json'), 'utf8');
    return normalizeSourceConfig(JSON.parse(rawConfig) as Record<string, unknown>);
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function itemToInsight(category: RssCategory, group: FeedSourceGroup, source: FeedSource, item: ExtendedItem): CategoryInsight | null {
  const title = (item.title ?? '').trim();
  const link = (item.link ?? '').trim();
  if (!title || !link) return null;

  const rawSummary =
    item.contentSnippet ??
    item.summary ??
    item.content ??
    item['content:encoded'] ??
    'No summary available';

  const summary = truncate(stripHtml(rawSummary), 180);
  return {
    category,
    ...(group.group ? { sourceGroup: group.group } : {}),
    title,
    summary,
    link,
    source: source.name,
    publishedAt: item.isoDate ?? item.pubDate ?? '',
    image: extractImage(item) ?? '',
    readTime: estimateReadTime(summary),
  };
}

async function fetchSourceInsights(
  category: RssCategory,
  group: FeedSourceGroup,
  source: FeedSource,
  options: Required<Pick<FetchCategoryInsightsOptions, 'logger' | 'parseFeed'>>,
): Promise<CategoryInsight[]> {
  try {
    const feed = await options.parseFeed(source.url);
    const insights = (feed.items ?? [])
      .map((item) => itemToInsight(category, group, source, item))
      .filter((item): item is CategoryInsight => item !== null);

    if (insights.length === 0) {
      options.logger.warn(
        'RSS source returned no usable items',
        `${source.name} (${source.url})`,
      );
    }

    return insights;
  } catch (error) {
    options.logger.warn(
      'Failed to fetch RSS source',
      `${source.name} (${source.url}): ${toErrorMessage(error)}`,
    );
    return [];
  }
}

export async function fetchCategoryInsights(
  category: RssCategory,
  groups: FeedSourceGroup[],
  options: FetchCategoryInsightsOptions = {},
): Promise<CategoryInsight[]> {
  const limit = options.limit ?? 8;
  const fetchOptions = {
    logger: options.logger ?? console,
    parseFeed: options.parseFeed ?? ((url: string) => parser.parseURL(url) as Promise<ParsedFeed>),
  };

  const sourceTasks = groups.flatMap((group) =>
    group.sources.map((source) => fetchSourceInsights(category, group, source, fetchOptions)),
  );
  const candidates = (await Promise.all(sourceTasks)).flat();

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

export async function getRssHomepageData(): Promise<Omit<HomepageData, 'insights'> & { insights: Omit<HomepageInsights, 'Blog'> }> {
  const sources = shouldUseVercelStorage() ? await getSourcesFromEdgeConfig() : await getSourcesFromLocalEdgeConfig();

  if (!sources) {
    return {
      navigation: categoryOrder.map((category) => ({ category, groups: [] })),
      insights: Object.fromEntries(categoryOrder.map((category) => [category, []])) as Omit<HomepageInsights, 'Blog'>,
    };
  }

  const results = await Promise.all(
    sources.navigation.map(
      async ({ category }) => [category, await fetchCategoryInsights(category, sources.sources[category] ?? [])] as const,
    ),
  );

  return {
    navigation: sources.navigation,
    insights: Object.fromEntries(results) as Omit<HomepageInsights, 'Blog'>,
  };
}

export async function getRssHomepageInsights(): Promise<Omit<HomepageInsights, 'Blog'>> {
  return (await getRssHomepageData()).insights;
}
