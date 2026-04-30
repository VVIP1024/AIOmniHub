'use client';

import Graph from 'graphology';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type NodeKind = 'repo' | 'user' | 'language' | 'topic';
type IndustryKey = 'all' | 'ai' | 'agent' | 'rag' | 'skill' | 'web' | 'data';
type GraphFilter =
  | { type: 'all'; value: '' }
  | { type: 'language'; value: string }
  | { type: 'topic'; value: string };

interface GitHubOwner {
  login: string;
  html_url: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  created_at: string;
  owner: GitHubOwner;
}

interface GitHubSearchResponse {
  items: GitHubRepository[];
}

interface TrendNode {
  id: string;
  name: string;
  kind: NodeKind;
  val: number;
  color: string;
  count?: number;
  url?: string;
  stars?: number;
  description?: string | null;
}

interface TrendLink {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: TrendNode[];
  links: TrendLink[];
}

interface ForceGraphInstance {
  _destructor?: () => void;
  width: (value: number) => ForceGraphInstance;
  height: (value: number) => ForceGraphInstance;
  backgroundColor: (value: string) => ForceGraphInstance;
  graphData: (value: GraphData) => ForceGraphInstance;
  nodeId: (value: string) => ForceGraphInstance;
  nodeVal: (value: string) => ForceGraphInstance;
  nodeColor: (value: string) => ForceGraphInstance;
  nodeLabel: (value: (node: TrendNode) => string) => ForceGraphInstance;
  linkLabel: (value: (link: TrendLink) => string) => ForceGraphInstance;
  linkDirectionalArrowLength: (value: number) => ForceGraphInstance;
  linkDirectionalArrowRelPos: (value: number) => ForceGraphInstance;
  linkColor: (value: () => string) => ForceGraphInstance;
  onNodeClick: (value: (node: TrendNode) => void) => ForceGraphInstance;
  nodeCanvasObject: (
    value: (
      node: TrendNode & { x?: number; y?: number },
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => void,
  ) => ForceGraphInstance;
}

type ForceGraphFactory = () => (element: HTMLElement) => ForceGraphInstance;

interface CachePayload {
  timestamp: number;
  repos: GitHubRepository[];
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const NODE_COLORS: Record<NodeKind, string> = {
  repo: '#111827',
  user: '#2170e4',
  language: '#d97706',
  topic: '#059669',
};

const INDUSTRY_PRESETS: Record<IndustryKey, { label: string; query: string }> = {
  all: { label: '全部行业', query: '' },
  ai: { label: 'AI / 机器学习', query: 'topic:ai' },
  agent: { label: 'Agent / 自动化', query: 'agent' },
  rag: { label: 'RAG / 知识库', query: 'rag' },
  skill: { label: 'Skill / 能力编排', query: 'skill' },
  web: { label: 'Web / 前端', query: 'topic:web' },
  data: { label: 'Data / 数据工程', query: 'topic:data' },
};

function getCacheKey(days: number, minStars: number, limit: number, industry: IndustryKey): string {
  return `github-trends:${days}:${minStars}:${limit}:${industry}`;
}

function getSinceDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function addNode(graph: Graph, node: TrendNode) {
  if (!graph.hasNode(node.id)) {
    graph.addNode(node.id, node);
  }
}

function addEdge(graph: Graph, source: string, target: string, label: string) {
  const edgeKey = `${source}->${label}->${target}`;
  if (!graph.hasEdge(edgeKey)) {
    graph.addDirectedEdgeWithKey(edgeKey, source, target, { label });
  }
}

function buildTrendGraph(repos: GitHubRepository[]): GraphData {
  const graph = new Graph({ type: 'directed', multi: false });
  const languageCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();

  for (const repo of repos) {
    if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
    for (const topic of (repo.topics ?? []).slice(0, 5)) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  for (const repo of repos) {
    const repoId = `repo:${repo.full_name}`;
    const userId = `user:${repo.owner.login}`;

    addNode(graph, {
      id: repoId,
      name: repo.full_name,
      kind: 'repo',
      val: Math.max(6, Math.log10(repo.stargazers_count + 10) * 5),
      color: NODE_COLORS.repo,
      url: repo.html_url,
      stars: repo.stargazers_count,
      description: repo.description,
    });

    addNode(graph, {
      id: userId,
      name: repo.owner.login,
      kind: 'user',
      val: 7,
      color: NODE_COLORS.user,
      url: repo.owner.html_url,
    });
    addEdge(graph, repoId, userId, '由');

    if (repo.language) {
      const languageId = `language:${repo.language}`;
      const count = languageCounts.get(repo.language) ?? 1;
      addNode(graph, {
        id: languageId,
        name: repo.language,
        kind: 'language',
        val: 10 + count * 4,
        color: NODE_COLORS.language,
        count,
      });
      addEdge(graph, repoId, languageId, '使用');
    }

    for (const topic of (repo.topics ?? []).slice(0, 5)) {
      const topicId = `topic:${topic}`;
      const count = topicCounts.get(topic) ?? 1;
      addNode(graph, {
        id: topicId,
        name: topic,
        kind: 'topic',
        val: 5 + count * 1.5,
        color: NODE_COLORS.topic,
        count,
      });
      addEdge(graph, repoId, topicId, '属于');
    }
  }

  const nodes: TrendNode[] = [];
  const links: TrendLink[] = [];

  graph.forEachNode((nodeId, attributes) => {
    nodes.push({ id: nodeId, ...(attributes as Omit<TrendNode, 'id'>) });
  });

  graph.forEachEdge((_edge, attributes, source, target) => {
    links.push({
      source,
      target,
      label: String((attributes as { label: string }).label),
    });
  });

  return { nodes, links };
}

async function fetchTrendingRepositories(
  days: number,
  minStars: number,
  limit: number,
  industry: IndustryKey,
  force = false,
) {
  const cacheKey = getCacheKey(days, minStars, limit, industry);
  const cached = localStorage.getItem(cacheKey);

  if (!force && cached) {
    const parsed = JSON.parse(cached) as CachePayload;
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return { repos: parsed.repos, fromCache: true };
    }
  }

  const since = getSinceDate(days);
  const queryParts = [INDUSTRY_PRESETS[industry].query, `created:>${since}`, `stars:>${minStars}`].filter(Boolean);
  const query = encodeURIComponent(queryParts.join(' '));
  const response = await fetch(
    `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${limit}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API 请求失败：${response.status}`);
  }

  const data = (await response.json()) as GitHubSearchResponse;
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), repos: data.items }));
  return { repos: data.items, fromCache: false };
}

export default function GitHubTrendsGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphInstance | null>(null);
  const [days, setDays] = useState(30);
  const [industry, setIndustry] = useState<IndustryKey>('all');
  const [minStars, setMinStars] = useState(100);
  const [limit, setLimit] = useState(30);
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [status, setStatus] = useState('等待加载 GitHub 趋势数据。');
  const [isLoading, setIsLoading] = useState(false);
  const [graphFilter, setGraphFilter] = useState<GraphFilter>({ type: 'all', value: '' });

  const filteredRepos = useMemo(() => {
    if (graphFilter.type === 'language') {
      return repos.filter((repo) => repo.language === graphFilter.value);
    }

    if (graphFilter.type === 'topic') {
      return repos.filter((repo) => (repo.topics ?? []).includes(graphFilter.value));
    }

    return repos;
  }, [graphFilter, repos]);
  const graphData = useMemo(() => buildTrendGraph(filteredRepos), [filteredRepos]);
  const languageStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [repos]);

  const activeFilterLabel =
    graphFilter.type === 'language'
      ? `语言：${graphFilter.value}`
      : graphFilter.type === 'topic'
        ? `Topic：${graphFilter.value}`
        : '全部项目';
  const topicStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      for (const topic of (repo.topics ?? []).slice(0, 5)) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [repos]);

  async function loadTrends(force = false) {
    setIsLoading(true);
    setStatus(force ? '正在刷新 GitHub 趋势数据...' : '正在加载 GitHub 趋势数据...');

    try {
      const result = await fetchTrendingRepositories(days, minStars, limit, industry, force);
      setRepos(result.repos);
      setSelectedRepo(result.repos[0] ?? null);
      setGraphFilter({ type: 'all', value: '' });
      const rangeLabel = days === 7 ? '本周' : days === 30 ? '本月' : '本季度';
      setStatus(
        result.fromCache
          ? `已从 localStorage 缓存恢复 ${rangeLabel} · ${INDUSTRY_PRESETS[industry].label} 数据。`
          : `已从 GitHub API 获取 ${rangeLabel} · ${INDUSTRY_PRESETS[industry].label} 趋势数据。`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'GitHub 趋势数据加载失败。');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTrends();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderGraph() {
      if (!containerRef.current || graphData.nodes.length === 0) return;
      const { default: rawForceGraph } = await import('force-graph');
      const ForceGraph = rawForceGraph as unknown as ForceGraphFactory;
      if (!isMounted || !containerRef.current) return;

      graphRef.current?._destructor?.();
      const width = containerRef.current.clientWidth || 720;
      const height = 680;
      const graph = ForceGraph()(containerRef.current)
        .width(width)
        .height(height)
        .backgroundColor('#fcf8fa')
        .graphData(graphData)
        .nodeId('id')
        .nodeVal('val')
        .nodeColor('color')
        .nodeLabel((node: TrendNode) => `${node.name}${node.stars ? ` · ${compactNumber(node.stars)} stars` : ''}`)
        .linkLabel((link: TrendLink) => link.label)
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(1)
        .linkColor(() => 'rgba(69, 70, 77, 0.22)')
        .onNodeClick((node: TrendNode) => {
          const repo = filteredRepos.find((item) => `repo:${item.full_name}` === node.id);
          if (repo) setSelectedRepo(repo);
          if (!repo && node.url) window.open(node.url, '_blank', 'noreferrer');
        })
        .nodeCanvasObject((node: TrendNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const size =
            node.kind === 'language'
              ? Math.min(24, Math.max(10, node.val / 1.8))
              : node.kind === 'topic'
                ? Math.min(14, Math.max(5, node.val / 1.7))
                : node.kind === 'repo'
                  ? 7
                  : 5;

          if (node.kind === 'language') {
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, size + 10, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.fill();

          const label = node.kind === 'language' && node.count ? `${node.name} (${node.count})` : node.name;
          const fontSize = node.kind === 'language' ? Math.max(12, 18 / globalScale) : Math.max(10, 13 / globalScale);
          ctx.font = `${node.kind === 'language' ? '600 ' : ''}${fontSize}px Newsreader, serif`;
          ctx.fillStyle = '#1b1b1d';
          ctx.fillText(label, (node.x ?? 0) + size + 3, (node.y ?? 0) + 3);
        });

      graphRef.current = graph;
    }

    void renderGraph();

    return () => {
      isMounted = false;
      graphRef.current?._destructor?.();
    };
  }, [filteredRepos, graphData]);

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current || !graphRef.current) return;
      graphRef.current.width(containerRef.current.clientWidth || 720);
      graphRef.current.height(680);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTrends(true);
  }

  return (
    <section className="max-w-container-max mx-auto px-gutter py-xxl">
      <div className="mb-xl max-w-[820px]">
        <span className="mb-sm inline-flex rounded-full bg-secondary-container/10 px-3 py-1 font-label-sm text-label-sm text-secondary-container">
          GITHUB 趋势导航仪
        </span>
        <h1 className="font-h1 text-h1 text-on-surface">GitHub图谱雷达</h1>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
          <form className="space-y-md" onSubmit={handleSubmit}>
            <label className="block">
              <span className="font-label-sm text-label-sm text-on-surface-variant">聚合周期</span>
              <select
                className="mt-xs w-full rounded-xl border border-outline-variant bg-white p-sm font-body-md text-body-md"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={7}>本周</option>
                <option value={30}>本月</option>
                <option value={90}>本季度</option>
              </select>
            </label>

            <label className="block">
              <span className="font-label-sm text-label-sm text-on-surface-variant">行业 / 主题聚合</span>
              <select
                className="mt-xs w-full rounded-xl border border-outline-variant bg-white p-sm font-body-md text-body-md"
                value={industry}
                onChange={(event) => setIndustry(event.target.value as IndustryKey)}
              >
                {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-label-sm text-label-sm text-on-surface-variant">最低 Stars</span>
              <input
                className="mt-xs w-full rounded-xl border border-outline-variant bg-white p-sm font-body-md text-body-md"
                min={0}
                step={50}
                type="number"
                value={minStars}
                onChange={(event) => setMinStars(Number(event.target.value))}
              />
            </label>

            <label className="block">
              <span className="font-label-sm text-label-sm text-on-surface-variant">返回项目数</span>
              <input
                className="mt-xs w-full rounded-xl border border-outline-variant bg-white p-sm font-body-md text-body-md"
                max={100}
                min={1}
                step={1}
                type="number"
                value={limit}
                onChange={(event) => setLimit(Math.min(100, Math.max(1, Number(event.target.value))))}
              />
              <span className="mt-xs block font-label-sm text-label-sm text-on-surface-variant">
                GitHub Search API 单页最多返回 100 个项目
              </span>
            </label>

            <button
              className="w-full rounded-xl bg-primary px-5 py-3 font-nav-link text-nav-link text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? '加载中...' : '刷新趋势图谱'}
            </button>
          </form>

          <div className="mt-lg rounded-xl bg-surface-container-low p-md font-body-md text-body-md text-on-surface-variant">
            {status}
          </div>

          {repos.length > 0 && (
            <div className="mt-lg rounded-xl border border-outline-variant bg-white p-md">
              <div className="flex items-center justify-between gap-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant">当前图谱过滤</span>
                {graphFilter.type !== 'all' && (
                  <button
                    className="border-0 bg-transparent p-0 font-label-sm text-label-sm text-secondary-container underline-offset-4 hover:underline"
                    type="button"
                    onClick={() => setGraphFilter({ type: 'all', value: '' })}
                  >
                    清除
                  </button>
                )}
              </div>
              <p className="mt-xs font-body-md text-body-md text-on-surface">
                {activeFilterLabel}
              </p>
              <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
                右侧展示 {filteredRepos.length} / {repos.length} 个项目
              </p>
            </div>
          )}

          {selectedRepo && (
            <div className="mt-lg rounded-xl border border-outline-variant bg-white p-md">
              <span className="font-label-sm text-label-sm text-on-surface-variant">当前项目</span>
              <a
                className="mt-md inline-flex font-nav-link text-nav-link text-secondary-container underline-offset-4 hover:underline"
                href={selectedRepo.html_url}
                rel="noreferrer"
                target="_blank"
              >
              <h2 className="mt-xs font-h3 text-h3 text-on-surface">{selectedRepo.full_name}</h2>
              </a>
              <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
                {selectedRepo.description || '暂无描述'}
              </p>
              <div className="mt-md flex flex-wrap gap-2">
                <span className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm">
                  ★ {compactNumber(selectedRepo.stargazers_count)}
                </span>
                <span className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm">
                  Fork {compactNumber(selectedRepo.forks_count)}
                </span>
                {selectedRepo.language && (
                  <span className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm">
                    {selectedRepo.language}
                  </span>
                )}
              </div>
            </div>
          )}

          {languageStats.length > 0 && (
            <div className="mt-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant">语言簇</span>
              <div className="mt-sm space-y-sm">
                {languageStats.map(([language, count]) => (
                  <button
                    key={language}
                    className={`block w-full rounded-xl border p-sm text-left transition-colors ${
                      graphFilter.type === 'language' && graphFilter.value === language
                        ? 'border-[#d97706] bg-[#d97706]/10'
                        : 'border-transparent hover:border-outline-variant hover:bg-surface-container-low'
                    }`}
                    type="button"
                    onClick={() => setGraphFilter({ type: 'language', value: language })}
                  >
                    <div className="mb-1 flex items-center justify-between font-body-md text-body-md">
                      <span>{language}</span>
                      <span className="text-on-surface-variant">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-[#d97706]"
                        style={{ width: `${Math.max(12, (count / Math.max(languageStats[0]?.[1] ?? 1, 1)) * 100)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topicStats.length > 0 && (
            <div className="mt-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant">行业热点 Topic</span>
              <div className="mt-sm flex flex-wrap gap-2">
                {topicStats.map(([topic, count]) => (
                  <button
                    key={topic}
                    className={`rounded-full border px-3 py-1 font-label-sm text-label-sm transition-colors ${
                      graphFilter.type === 'topic' && graphFilter.value === topic
                        ? 'border-[#059669] bg-[#059669]/10 text-on-surface'
                        : 'border-transparent bg-surface-container hover:border-outline-variant'
                    }`}
                    type="button"
                    onClick={() => setGraphFilter({ type: 'topic', value: topic })}
                  >
                    {topic} · {count}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div ref={containerRef} className="h-[680px] w-full" />
        </div>
      </div>
    </section>
  );
}
