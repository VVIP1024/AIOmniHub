export interface GitHubTrendsRequest {
  days: number;
  minStars: number;
  limit: number;
  industry: string;
}

export interface GitHubTrendsResponse<TRepository> {
  items: TRepository[];
}

export async function fetchGitHubTrends<TRepository>({
  days,
  minStars,
  limit,
  industry,
}: GitHubTrendsRequest): Promise<GitHubTrendsResponse<TRepository>> {
  const params = new URLSearchParams({
    days: String(days),
    minStars: String(minStars),
    limit: String(limit),
    industry,
  });
  const response = await fetch(`/api/github-trends?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`GitHub 趋势 BFF 请求失败：${response.status}`);
  }

  return response.json() as Promise<GitHubTrendsResponse<TRepository>>;
}
