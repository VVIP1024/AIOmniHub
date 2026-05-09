import type { GitHubTrendsRequest, GitHubTrendsResponse } from '../types.js';

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

function parseIndustry(value: string): IndustryKey {
  return value in INDUSTRY_QUERIES ? (value as IndustryKey) : 'all';
}

function parseDays(value: number): number {
  return VALID_DAYS.has(value) ? value : DEFAULT_DAYS;
}

function getSinceDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function fetchGitHubTrends(input: GitHubTrendsRequest): Promise<GitHubTrendsResponse> {
  const days = parseDays(input.days);
  const industry = parseIndustry(input.industry);
  const since = getSinceDate(days);
  const queryParts = [INDUSTRY_QUERIES[industry], `created:>${since}`, `stars:>${input.minStars}`].filter(Boolean);
  const githubUrl = new URL('https://api.github.com/search/repositories');

  githubUrl.searchParams.set('q', queryParts.join(' '));
  githubUrl.searchParams.set('sort', 'stars');
  githubUrl.searchParams.set('order', 'desc');
  githubUrl.searchParams.set('per_page', String(input.limit));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(githubUrl, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GitHubSearchResponse;
  return {
    items: Array.isArray(data.items) ? data.items : [],
  };
}
