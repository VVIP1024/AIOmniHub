'use client';

import Graph from 'graphology';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type NodeKind = 'repo' | 'user' | 'language' | 'topic';
type IndustryKey = 'all' | 'ai' | 'agent' | 'rag' | 'skill' | 'web' | 'data';

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
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesLanguage = selectedLanguages.length === 0 || (repo.language !== null && selectedLanguages.includes(repo.language));
      const matchesTopic =
        selectedTopics.length === 0 || selectedTopics.some((topic) => (repo.topics ?? []).includes(topic));

      return matchesLanguage && matchesTopic;
    });
  }, [repos, selectedLanguages, selectedTopics]);
  const graphData = useMemo(() => buildTrendGraph(filteredRepos), [filteredRepos]);
  const languageStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [repos]);

  const hasGraphFilter = selectedLanguages.length > 0 || selectedTopics.length > 0;
  const activeFilterLabel = hasGraphFilter
    ? [
        selectedLanguages.length > 0 ? `语言：${selectedLanguages.join('、')}` : '',
        selectedTopics.length > 0 ? `Topic：${selectedTopics.join('、')}` : '',
      ]
        .filter(Boolean)
        .join(' / ')
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
    setLoadError('');

    try {
      const result = await fetchTrendingRepositories(days, minStars, limit, industry, force);
      setRepos(result.repos);
      setSelectedRepo(result.repos[0] ?? null);
      setSelectedLanguages([]);
      setSelectedTopics([]);
    } catch (error) {
      console.error('Error loading GitHub trends:', error);
      setRepos([]);
      setSelectedRepo(null);
      setLoadError(error instanceof Error ? error.message : '加载失败');
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
      if (!containerRef.current) return;
      if (graphData.nodes.length === 0) {
        graphRef.current?._destructor?.();
        graphRef.current = null;
        return;
      }

      const { default: rawForceGraph } = await import('force-graph');
      const ForceGraph = rawForceGraph as unknown as ForceGraphFactory;
      if (!isMounted || !containerRef.current) return;

      graphRef.current?._destructor?.();
      const width = containerRef.current.clientWidth || 720;
      const height = 760;
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
      graphRef.current.height(760);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTrends(true);
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language) ? current.filter((item) => item !== language) : [...current, language],
    );
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic],
    );
  }

  function clearGraphFilters() {
    setSelectedLanguages([]);
    setSelectedTopics([]);
  }

  return (
    <section className="max-w-container-max mx-auto px-gutter py-xxl">
      <div className="mb-lg max-w-[820px]">
        <h1 className="font-h1 text-h1 text-on-surface">GitHub图谱雷达</h1>
      </div>

      <form
        className="mb-gutter grid grid-cols-1 items-end gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:grid-cols-5"
        onSubmit={handleSubmit}
      >
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
        </label>

        <button
          className="rounded-xl bg-primary px-5 py-3 font-nav-link text-nav-link text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? '加载中...' : '刷新趋势图谱'}
        </button>
      </form>

      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div ref={containerRef} className="h-[760px] w-full" />

        <div className="absolute left-md top-md z-10 max-h-[700px] w-[320px] overflow-y-auto rounded-xl border border-outline-variant bg-white/90 p-md shadow-lg backdrop-blur-md">
          <div className="mb-md flex items-start justify-between gap-sm">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">图谱过滤</span>
              <p className="mt-xs font-body-md text-body-md text-on-surface">{activeFilterLabel}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                展示 {filteredRepos.length} / {repos.length} 个项目
              </p>
            </div>
            {hasGraphFilter && (
              <button
                className="border-0 bg-transparent p-0 font-label-sm text-label-sm text-secondary-container underline-offset-4 hover:underline"
                type="button"
                onClick={clearGraphFilters}
              >
                清除
              </button>
            )}
          </div>

          {languageStats.length > 0 && (
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">语言簇</span>
              <div className="mt-sm space-y-sm">
                {languageStats.map(([language, count]) => (
                  <button
                    key={language}
                    className={`block w-full rounded-xl border p-sm text-left transition-colors ${
                      selectedLanguages.includes(language)
                        ? 'border-[#d97706] bg-[#d97706]/10'
                        : 'border-transparent hover:border-outline-variant hover:bg-surface-container-low'
                    }`}
                    type="button"
                    onClick={() => toggleLanguage(language)}
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
                      selectedTopics.includes(topic)
                        ? 'border-[#059669] bg-[#059669]/10 text-on-surface'
                        : 'border-transparent bg-surface-container hover:border-outline-variant'
                    }`}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic} · {count}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedRepo && (
          <div className="absolute bottom-md right-md z-10 w-[360px] rounded-xl border border-outline-variant bg-white/90 p-md shadow-lg backdrop-blur-md">
            <span className="font-label-sm text-label-sm text-on-surface-variant">当前项目</span>
            <a
              className="mt-xs block font-h3 text-h3 text-on-surface underline-offset-4 hover:underline"
              href={selectedRepo.html_url}
              rel="noreferrer"
              target="_blank"
            >
              {selectedRepo.full_name}
            </a>
            <p className="mt-sm line-clamp-3 font-body-md text-body-md text-on-surface-variant">
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

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="rounded-full border border-outline-variant bg-white px-5 py-3 font-nav-link text-nav-link text-on-surface shadow-lg">
              加载中...
            </div>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="rounded-xl border border-error-container bg-white p-lg text-center shadow-lg">
              <h2 className="font-h3 text-h3 text-error">加载失败</h2>
              <p className="mt-sm max-w-[420px] font-body-md text-body-md text-on-surface-variant">{loadError}</p>
            </div>
          </div>
        )}

        {!loadError && !isLoading && repos.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-xl border border-outline-variant bg-white/90 p-lg text-center shadow-lg">
              <p className="font-body-lg text-body-lg text-on-surface-variant">点击上方按钮加载 GitHub 趋势图谱</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
