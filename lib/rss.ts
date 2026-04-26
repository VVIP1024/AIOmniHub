import Parser from 'rss-parser';

export type Category =
  | 'AI Strategy'
  | 'Tech Trends'
  | 'Policy & Regulation'
  | 'Ethics & Governance'
  | 'Research & Data';

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
}

type ExtendedItem = Parser.Item & {
  'content:encoded'?: string;
  'media:content'?: Array<{ $?: { url?: string } }>;
};

export type HomepageInsights = Record<Category, CategoryInsight[]>;

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AIOmniHub/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
});

const CATEGORY_ORDER: Category[] = [
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
};

const DEFAULT_SOURCES: Record<Category, FeedSource[]> = {
  'AI Strategy': [
    {
      name: 'Google News - AI Strategy',
      url: 'https://news.google.com/rss/search?q=enterprise+AI+strategy&hl=en-US&gl=US&ceid=US:en',
    },
    {
      name: 'OpenAI News',
      url: 'https://openai.com/news/rss.xml',
    },
  ],
  'Tech Trends': [
    {
      name: 'Google News - AI Tech Trends',
      url: 'https://news.google.com/rss/search?q=AI+technology+trends&hl=en-US&gl=US&ceid=US:en',
    },
    {
      name: 'Hugging Face Blog',
      url: 'https://huggingface.co/blog/feed.xml',
    },
  ],
  'Policy & Regulation': [
    {
      name: 'Google News - AI Policy',
      url: 'https://news.google.com/rss/search?q=AI+policy+regulation&hl=en-US&gl=US&ceid=US:en',
    },
  ],
  'Ethics & Governance': [
    {
      name: 'Google News - AI Ethics',
      url: 'https://news.google.com/rss/search?q=AI+ethics+governance&hl=en-US&gl=US&ceid=US:en',
    },
  ],
  'Research & Data': [
    {
      name: 'Google News - AI Research',
      url: 'https://news.google.com/rss/search?q=AI+research+benchmark&hl=en-US&gl=US&ceid=US:en',
    },
    {
      name: 'arXiv cs.AI',
      url: 'http://export.arxiv.org/rss/cs.AI',
    },
  ],
};

function isCategory(value: string): value is Category {
  return CATEGORY_ORDER.includes(value as Category);
}

function getSourcesFromEnv(): Record<Category, FeedSource[]> | null {
  const raw = process.env.RSS_SOURCES_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, FeedSource[]>;
    const mapped: Partial<Record<Category, FeedSource[]>> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (!isCategory(key) || !Array.isArray(value)) continue;
      const cleaned = value.filter(
        (item) => item && typeof item.name === 'string' && typeof item.url === 'string',
      );
      if (cleaned.length > 0) mapped[key] = cleaned;
    }

    const isComplete = CATEGORY_ORDER.every((key) => Array.isArray(mapped[key]) && mapped[key]!.length > 0);
    return isComplete ? (mapped as Record<Category, FeedSource[]>) : null;
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

function fallbackInsight(category: Category): CategoryInsight {
  return {
    category,
    title: `No RSS articles found for ${category}`,
    summary: 'Please check RSS source availability or configure RSS_SOURCES_JSON to provide valid feed URLs.',
    link: '#',
    source: 'Fallback',
    publishedAt: new Date(0).toISOString(),
    image: DEFAULT_IMAGES[category],
    readTime: '4 MIN READ',
  };
}

async function fetchCategoryInsights(
  category: Category,
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

  if (candidates.length === 0) {
    return [fallbackInsight(category)];
  }

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
  const sources = getSourcesFromEnv() ?? DEFAULT_SOURCES;

  const results = await Promise.all(
    CATEGORY_ORDER.map(
      async (category) => [category, await fetchCategoryInsights(category, sources[category])] as const,
    ),
  );

  return Object.fromEntries(results) as HomepageInsights;
}

export const categoryOrder = CATEGORY_ORDER;
