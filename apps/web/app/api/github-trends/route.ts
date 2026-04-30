import { NextResponse } from 'next/server';

type IndustryKey = 'all' | 'ai' | 'agent' | 'rag' | 'skill' | 'web' | 'data';

interface GitHubSearchResponse {
  items?: unknown[];
}

const INDUSTRY_QUERIES: Record<IndustryKey, string> = {
  all: '',
  ai: 'topic:ai',
  agent: 'agent',
  rag: 'rag',
  skill: 'skill',
  web: 'topic:web',
  data: 'topic:data',
};

const VALID_DAYS = new Set([7, 30, 90]);
const DEFAULT_DAYS = 30;
const DEFAULT_MIN_STARS = 100;
const DEFAULT_LIMIT = 30;

function clampNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseDays(value: string | null): number {
  const parsed = clampNumber(value, DEFAULT_DAYS, 1, 365);
  return VALID_DAYS.has(parsed) ? parsed : DEFAULT_DAYS;
}

function parseIndustry(value: string | null): IndustryKey {
  return value && value in INDUSTRY_QUERIES ? (value as IndustryKey) : 'all';
}

function getSinceDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseDays(searchParams.get('days'));
  const minStars = clampNumber(searchParams.get('minStars'), DEFAULT_MIN_STARS, 0, 1_000_000);
  const limit = clampNumber(searchParams.get('limit'), DEFAULT_LIMIT, 1, 100);
  const industry = parseIndustry(searchParams.get('industry'));
  const since = getSinceDate(days);
  const queryParts = [INDUSTRY_QUERIES[industry], `created:>${since}`, `stars:>${minStars}`].filter(Boolean);
  const githubUrl = new URL('https://api.github.com/search/repositories');

  githubUrl.searchParams.set('q', queryParts.join(' '));
  githubUrl.searchParams.set('sort', 'stars');
  githubUrl.searchParams.set('order', 'desc');
  githubUrl.searchParams.set('per_page', String(limit));

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(githubUrl, {
      headers,
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API request failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as GitHubSearchResponse;

    return NextResponse.json(
      {
        items: Array.isArray(data.items) ? data.items : [],
      },
      {
        headers: {
          'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'GitHub trends request failed' }, { status: 502 });
  }
}
