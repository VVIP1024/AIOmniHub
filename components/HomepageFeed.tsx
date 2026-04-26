'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, CategoryInsight, HomepageInsights } from '@/lib/rss';

type FilterKey = 'All Insights' | Category;

interface HomepageFeedProps {
  categoryOrder: Category[];
  insights: HomepageInsights;
}

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
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

function isInsight(item: CategoryInsight | undefined): item is CategoryInsight {
  return item !== undefined;
}

function getLinkProps(link: string) {
  return link.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' };
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

  const filteredList = activeFilter === 'All Insights' ? [] : insights[activeFilter];

  return (
    <>
      {availableCategories.length > 0 && (
        <nav className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-sans manrope full-width border-b border-slate-100 dark:border-slate-900 flat no shadows sticky top-[72px] z-40 backdrop-blur-sm">
          <div
            className="flex justify-center items-center w-full gap-4 py-3 px-8 overflow-x-auto max-w-7xl mx-auto"
            role="tablist"
            aria-label="Insight categories"
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
                      ? 'appearance-none border-0 text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 rounded-full px-4 py-1 shadow-sm font-nav-link text-nav-link whitespace-nowrap transition-all'
                      : 'appearance-none border-0 bg-transparent text-slate-500 dark:text-slate-400 px-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all font-nav-link text-nav-link whitespace-nowrap'
                  }
                >
                  {item}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <main className="flex-grow">
        <section className="max-w-container-max mx-auto px-gutter py-xxl text-center">
          <h1 className="font-h1 text-h1 text-primary mb-sm">AI Insights &amp; Strategy</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-reading-width mx-auto">Distilling complex intelligence into actionable frameworks.</p>
        </section>

        {activeFilter === 'All Insights' && availableCategories.length > 0 ? (
          <section className="max-w-container-max mx-auto px-gutter pb-xxl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {strategy && (
                <article className="col-span-1 md:col-span-8 group cursor-pointer">
                  <a href={strategy.link} {...getLinkProps(strategy.link)}>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden h-[480px] flex flex-col relative transition-all duration-300 hover:shadow-lg hover:shadow-primary-container/5">
                      <div className="h-2/3 w-full bg-surface-variant overflow-hidden">
                        <img alt={strategy.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={strategy.image} />
                      </div>
                      <div className="p-lg flex-grow flex flex-col justify-between bg-surface-container-lowest z-10">
                        <div>
                          <div className="flex items-center gap-sm mb-sm">
                            <span className="bg-surface-container px-3 py-1 rounded font-label-sm text-label-sm text-on-surface-variant">{strategy.category}</span>
                            <span className="text-on-surface-variant font-label-sm text-label-sm">{strategy.readTime}</span>
                          </div>
                          <h2 className="font-h2 text-h2 text-on-surface mb-xs group-hover:text-secondary-container transition-colors">{strategy.title}</h2>
                          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{strategy.summary}</p>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              )}

              {research && (
                <article className="col-span-1 md:col-span-4 group cursor-pointer">
                  <a href={research.link} {...getLinkProps(research.link)}>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden h-[480px] flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary-container/5">
                      <div className="h-1/2 w-full bg-surface-variant overflow-hidden">
                        <img alt={research.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={research.image} />
                      </div>
                      <div className="p-lg flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-sm mb-sm">
                            <span className="bg-surface-container px-3 py-1 rounded font-label-sm text-label-sm text-on-surface-variant">{research.category}</span>
                          </div>
                          <h3 className="font-h3 text-h3 text-on-surface mb-sm group-hover:text-secondary-container transition-colors">{research.title}</h3>
                          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-4">{research.summary}</p>
                        </div>
                        <div className="mt-4">
                          <span className="text-secondary-container font-label-sm text-label-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                            Read Report
                            <ArrowIcon />
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              )}

              {[policy, trends, ethics, ...insights.Blog].filter(isInsight).map((item) => (
                <article key={`${item.link}-${item.title}`} className="col-span-1 md:col-span-4 group cursor-pointer mt-lg">
                  <a href={item.link} {...getLinkProps(item.link)}>
                    <div className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-lg h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary-container/5 ${item.category === 'Ethics & Governance' ? 'bg-gradient-to-br from-surface-container-lowest to-surface-container-low' : ''}`}>
                      <div className="flex items-center gap-sm mb-md">
                        <span className="bg-surface-container px-3 py-1 rounded font-label-sm text-label-sm text-on-surface-variant">{item.category}</span>
                      </div>
                      <h3 className="font-h3 text-h3 text-on-surface mb-sm group-hover:text-secondary-container transition-colors">{item.title}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-md flex-grow">{item.summary}</p>
                      <div className="w-full h-[1px] bg-outline-variant/30 mb-md" />
                      <span className="text-on-surface-variant font-label-sm text-label-sm">{item.readTime}</span>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          </section>
        ) : activeFilter !== 'All Insights' ? (
          <section className="max-w-container-max mx-auto px-gutter pb-xxl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {filteredList.map((item) => (
                <article key={`${item.link}-${item.title}`} className="group cursor-pointer">
                  <a href={item.link} {...getLinkProps(item.link)}>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary-container/5">
                      <div className="h-52 w-full bg-surface-variant overflow-hidden">
                        <img
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          src={item.image}
                        />
                      </div>
                      <div className="p-lg flex-grow flex flex-col">
                        <div className="flex items-center justify-between gap-sm mb-sm">
                          <span className="bg-surface-container px-3 py-1 rounded font-label-sm text-label-sm text-on-surface-variant">
                            {item.category}
                          </span>
                          <span className="text-on-surface-variant font-label-sm text-label-sm">{item.readTime}</span>
                        </div>
                        <h3 className="font-h3 text-h3 text-on-surface mb-sm group-hover:text-secondary-container transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant mb-md flex-grow line-clamp-4">
                          {item.summary}
                        </p>
                        <div className="w-full h-[1px] bg-outline-variant/30 mb-md" />
                        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                          <span className="max-w-[55%] truncate">{item.source}</span>
                          <span>{formatDate(item.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
