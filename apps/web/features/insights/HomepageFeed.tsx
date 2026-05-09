'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, CategoryInsight, HomepageInsights } from '@/utils/rss';

type FilterKey = 'All Insights' | Category;

interface HomepageFeedProps {
  categoryOrder: Category[];
  insights: HomepageInsights;
}

const CATEGORY_LABELS: Record<FilterKey, string> = {
  'All Insights': '全部情报',
  'AI Strategy': '战略观察',
  'Tech Trends': '技术趋势',
  'Policy & Regulation': '政策合规',
  'Ethics & Governance': '伦理治理',
  'Research & Data': '研究数据',
  Blog: '深度文章',
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  'AI Strategy': '产品、商业化、组织采用与竞争策略',
  'Tech Trends': '模型、智能体、基础设施和工具链变化',
  'Policy & Regulation': '监管、合规、版权和行业政策',
  'Ethics & Governance': '治理、风险、安全和责任边界',
  'Research & Data': '论文、基准、数据集和实验结果',
  Blog: '长文解读、实操指南和专题内容',
};

const TOOL_CARDS = [
  {
    title: '文档智问',
    eyebrow: 'PDF 阅读助手',
    description: '上传 PDF，围绕文档内容提问，快速定位答案所在页面。',
    href: '/doc-chat',
    accent: 'border-l-[#2170e4]',
  },
  {
    title: '开源雷达',
    eyebrow: '开源趋势图谱',
    description: '按时间、Star 和主题聚合热门仓库，用图谱查看项目、语言和 Topic 关系。',
    href: '/github-trends',
    accent: 'border-l-[#059669]',
  },
];

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 3.5l1.8 5.1 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.3L5 10.4l5.2-1.8L12 3.5ZM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function isInsight(item: CategoryInsight | undefined): item is CategoryInsight {
  return item !== undefined;
}

function getLinkProps(link: string) {
  return link.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' };
}

function getCategoryLabel(category: FilterKey): string {
  return CATEGORY_LABELS[category] ?? category;
}

function TagList({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag}
          className="rounded-lg bg-[#f0efe9] px-2.5 py-1 font-label-sm text-[11px] text-slate-600"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function ArticleMeta({ item }: { item: CategoryInsight }) {
  return (
    <div className="flex mb-md flex-wrap items-center gap-2">
      <span className="rounded-lg bg-slate-950 px-2.5 py-1 font-label-sm text-[11px] text-white">
        {getCategoryLabel(item.category)}
      </span>
      <span className="font-label-sm text-[11px] text-slate-500">{item.readTime}</span>
    </div>
  );
}

function CompactArticleCard({ item }: { item: CategoryInsight }) {
  return (
    <article className="group h-full">
      <a className="block h-full" href={item.link} {...getLinkProps(item.link)}>
        <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <ArticleMeta item={item} />
          <TagList tags={item.tags} />
          <h3 className="mt-md font-h3 text-[24px] leading-tight text-slate-950 transition-colors group-hover:text-[#2170e4]">
            {item.title}
          </h3>
          <p className="mt-sm line-clamp-4 flex-grow font-body-md text-[15px] leading-7 text-slate-600">
            {item.summary}
          </p>
          <div className="mt-lg flex items-center justify-between border-t border-slate-200 pt-md font-label-sm text-[11px] text-slate-500">
            <span className="max-w-[55%] truncate">{getCategoryLabel(item.category)}</span>
            <span>{formatDate(item.publishedAt)}</span>
          </div>
        </div>
      </a>
    </article>
  );
}

export default function HomepageFeed({ categoryOrder, insights }: HomepageFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All Insights');

  const availableCategories = useMemo(
    () => categoryOrder.filter((category) => insights[category].length > 0),
    [categoryOrder, insights],
  );
  const tabs = useMemo<FilterKey[]>(() => ['All Insights', ...availableCategories], [availableCategories]);

  useEffect(() => {
    if (activeFilter !== 'All Insights' && !availableCategories.includes(activeFilter)) {
      setActiveFilter('All Insights');
    }
  }, [activeFilter, availableCategories]);

  const strategy = insights['AI Strategy'][0];
  const research = insights['Research & Data'][0];
  const policy = insights['Policy & Regulation'][0];
  const trends = insights['Tech Trends'][0];
  const ethics = insights['Ethics & Governance'][0];
  const recentBlogInsights = insights.Blog.slice(0, 3);
  const highlightedItems = [policy, trends, ethics, ...recentBlogInsights].filter(isInsight);
  const filteredList = activeFilter === 'All Insights' ? [] : insights[activeFilter];
  const totalInsights = availableCategories.reduce((sum, category) => sum + insights[category].length, 0);
  const latestItem = availableCategories
    .flatMap((category) => insights[category])
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];

  return (
    <>
      <main className="flex-grow bg-[#fbfaf6] text-slate-950">
        <section className="relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-xl px-4 py-[72px] md:grid-cols-[minmax(0,1.05fr)_420px] md:px-8 md:py-[88px]">
            <div>
              <div className="mb-md inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-label-sm text-[11px] text-slate-600 shadow-sm">
                <SparkIcon />
                AI 门户控制台
              </div>
              <h1 className="max-w-[760px] font-h1 text-[48px] leading-[1.05] text-slate-950 md:text-[68px]">
                一屏聚合 AI 资讯、深度解读和实用工具。
              </h1>
              <p className="mt-lg max-w-[650px] font-body-lg text-[20px] leading-9 text-slate-600">
                面向日常研究、产品判断和技术选型，把外部资讯、本地文章和可交互工具组织成一个更清楚的工作台。
              </p>
              <div className="mt-xl flex flex-wrap gap-3">
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 font-nav-link text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  href="#feed"
                >
                  查看今日情报
                  <ArrowIcon />
                </a>
                <a
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-nav-link text-[14px] font-semibold text-slate-800 transition-colors hover:border-slate-950"
                  href="#tools"
                >
                  打开工具箱
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-md shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
              <div className="grid grid-cols-2 gap-sm">
                <div className="rounded-lg bg-[#f5f2ea] p-md">
                  <span className="font-label-sm text-[11px] text-slate-500">内容总量</span>
                  <strong className="mt-2 block font-serif text-4xl leading-none text-slate-950">{totalInsights}</strong>
                </div>
                <div className="rounded-lg bg-[#ecf3ff] p-md">
                  <span className="font-label-sm text-[11px] text-slate-500">主题栏目</span>
                  <strong className="mt-2 block font-serif text-4xl leading-none text-slate-950">{availableCategories.length}</strong>
                </div>
                <div className="rounded-lg bg-[#edf7f0] p-md">
                  <span className="font-label-sm text-[11px] text-slate-500">深度文章</span>
                  <strong className="mt-2 block font-serif text-4xl leading-none text-slate-950">{insights.Blog.length}</strong>
                </div>
                <div className="rounded-lg bg-[#fff1dd] p-md">
                  <span className="font-label-sm text-[11px] text-slate-500">内置工具</span>
                  <strong className="mt-2 block font-serif text-4xl leading-none text-slate-950">{TOOL_CARDS.length}</strong>
                </div>
              </div>
              <div className="mt-md rounded-lg border border-slate-200 p-md">
                <span className="font-label-sm text-[11px] text-slate-500">最新更新</span>
                <p className="mt-2 line-clamp-3 font-h3 text-[22px] leading-tight text-slate-950">
                  {latestItem?.title ?? '等待最新内容更新'}
                </p>
                {latestItem && (
                  <p className="mt-sm font-label-sm text-[11px] text-slate-500">
                    {getCategoryLabel(latestItem.category)} · {formatDate(latestItem.publishedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {availableCategories.length > 0 && (
          <nav className="sticky top-[113px] z-40 border-b border-slate-200 bg-[#fbfaf6]/95 backdrop-blur-xl md:top-[65px]">
            <div
              className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 md:px-8"
              role="tablist"
              aria-label="情报分类"
            >
              {tabs.map((item) => {
                const isActive = activeFilter === item;
                return (
                  <button
                    key={item}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveFilter(item)}
                    className={
                      isActive
                        ? 'whitespace-nowrap rounded-lg bg-slate-950 px-4 py-2 font-nav-link text-[13px] font-semibold text-white shadow-sm transition-all'
                        : 'whitespace-nowrap rounded-lg bg-transparent px-4 py-2 font-nav-link text-[13px] font-semibold text-slate-500 transition-all hover:bg-white hover:text-slate-950'
                    }
                  >
                    {getCategoryLabel(item)}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <section id="feed" className="mx-auto max-w-7xl px-4 py-xxl md:px-8">
          <div className="mb-xl flex flex-col justify-between gap-md border-b border-slate-200 pb-md md:flex-row md:items-end">
            <div>
              <span className="font-label-sm text-[11px] text-slate-500">今日资讯</span>
              <h2 className="mt-sm font-h1 text-[40px] leading-tight text-slate-950">
                {activeFilter === 'All Insights' ? '今日 AI 情报流' : getCategoryLabel(activeFilter)}
              </h2>
            </div>
            {activeFilter !== 'All Insights' && (
              <p className="max-w-[460px] font-body-md text-[15px] leading-7 text-slate-600">
                {CATEGORY_DESCRIPTIONS[activeFilter]}
              </p>
            )}
          </div>

          {activeFilter === 'All Insights' && availableCategories.length > 0 ? (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              {strategy && (
                <article className="group md:col-span-7">
                  <a href={strategy.link} {...getLinkProps(strategy.link)}>
                    <div className="min-h-[540px] overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
                      <div className="h-[320px] overflow-hidden bg-slate-100">
                        <img
                          alt={strategy.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          src={strategy.image}
                        />
                      </div>
                      <div className="p-lg">
                        <ArticleMeta item={strategy} />
                        <h2 className="mt-md font-h2 text-[36px] leading-tight text-slate-950 transition-colors group-hover:text-[#2170e4]">
                          {strategy.title}
                        </h2>
                        <p className="mt-sm line-clamp-3 font-body-md text-[16px] leading-8 text-slate-600">
                          {strategy.summary}
                        </p>
                      </div>
                    </div>
                  </a>
                </article>
              )}

              {research && (
                <article className="group md:col-span-5">
                  <a href={research.link} {...getLinkProps(research.link)}>
                    <div className="flex min-h-[540px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#111827] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                      <div className="h-[260px] overflow-hidden bg-slate-800">
                        <img
                          alt={research.title}
                          className="h-full w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                          src={research.image}
                        />
                      </div>
                      <div className="flex flex-grow flex-col p-lg">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-white px-2.5 py-1 font-label-sm text-[11px] text-slate-950">
                            {getCategoryLabel(research.category)}
                          </span>
                          <span className="font-label-sm text-[11px] text-slate-300">{research.readTime}</span>
                        </div>
                        <h3 className="mt-md font-h2 text-[32px] leading-tight">{research.title}</h3>
                        <p className="mt-sm line-clamp-5 flex-grow font-body-md text-[15px] leading-7 text-slate-300">
                          {research.summary}
                        </p>
                        <span className="mt-lg inline-flex items-center gap-2 font-nav-link text-[14px] font-semibold">
                          读取研究摘要
                          <ArrowIcon />
                        </span>
                      </div>
                    </div>
                  </a>
                </article>
              )}

              {highlightedItems.map((item, index) => (
                <div
                  key={`${item.link}-${item.title}`}
                  id={item.category === 'Blog' && highlightedItems.findIndex((candidate) => candidate.category === 'Blog') === index ? 'articles' : undefined}
                  className="md:col-span-4"
                >
                  <CompactArticleCard item={item} />
                </div>
              ))}
            </div>
          ) : activeFilter !== 'All Insights' ? (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
              {filteredList.map((item) => (
                <article key={`${item.link}-${item.title}`} className="group">
                  <a className="block h-full" href={item.link} {...getLinkProps(item.link)}>
                    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <div className="h-52 overflow-hidden bg-slate-100">
                        <img
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          src={item.image}
                        />
                      </div>
                      <div className="flex flex-grow flex-col p-lg">
                        <ArticleMeta item={item} />
                        <TagList tags={item.tags} />
                        <h3 className="mt-md line-clamp-3 font-h3 text-[24px] leading-tight text-slate-950 transition-colors group-hover:text-[#2170e4]">
                          {item.title}
                        </h3>
                        <p className="mt-sm line-clamp-4 flex-grow font-body-md text-[15px] leading-7 text-slate-600">
                          {item.summary}
                        </p>
                        <div className="mt-lg flex items-center justify-between border-t border-slate-200 pt-md font-label-sm text-[11px] text-slate-500">
                          <span className="max-w-[55%] truncate">{getCategoryLabel(item.category)}</span>
                          <span>{formatDate(item.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section id="tools" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-xxl md:px-8">
            <div className="mb-xl max-w-[720px]">
              <span className="font-label-sm text-[11px] text-slate-500">实用工具</span>
              <h2 className="mt-sm font-h1 text-[40px] leading-tight text-slate-950">把阅读变成可执行动作</h2>
              <p className="mt-sm font-body-md text-[16px] leading-8 text-slate-600">
                门户不只展示信息，也提供可以直接投入工作的浏览器端工具。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
              {TOOL_CARDS.map((tool) => (
                <a
                  key={tool.href}
                  className={`group block rounded-lg border border-slate-200 border-l-4 ${tool.accent} bg-[#fbfaf6] p-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]`}
                  href={tool.href}
                >
                  <span className="font-label-sm text-[11px] text-slate-500">{tool.eyebrow}</span>
                  <h3 className="mt-sm font-h2 text-[32px] leading-tight text-slate-950">{tool.title}</h3>
                  <p className="mt-sm font-body-md text-[15px] leading-7 text-slate-600">{tool.description}</p>
                  <span className="mt-lg inline-flex items-center gap-2 font-nav-link text-[14px] font-semibold text-slate-950 transition-all group-hover:gap-3">
                    进入工具
                    <ArrowIcon />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
