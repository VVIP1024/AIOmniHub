'use client';

import { usePathname } from 'next/navigation';

type HeaderVariant = 'home' | 'details';

interface SiteHeaderProps {
  variant: HeaderVariant;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/', label: '情报流', match: (pathname: string) => pathname === '/' || pathname === '/details' },
  { href: '/#articles', label: '深度文章', match: (pathname: string) => pathname.startsWith('/blog') },
  { href: '/doc-chat', label: '文档智问', match: (pathname: string) => pathname.startsWith('/doc-chat') },
  { href: '/github-trends', label: '开源雷达', match: (pathname: string) => pathname.startsWith('/github-trends') },
];

const BRAND_TITLE_CLASS =
  'font-serif text-[24px] font-semibold leading-none text-slate-950 dark:text-slate-50 md:text-[30px]';

function getNavLinkClass(isActive: boolean): string {
  const base =
    'rounded-lg px-3 py-2 font-nav-link text-[13px] font-semibold leading-none transition-colors md:text-[14px]';

  return isActive
    ? `bg-slate-950 text-white shadow-sm dark:bg-slate-50 dark:text-slate-950 ${base}`
    : `text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100 ${base}`;
}

export default function SiteHeader({ variant }: SiteHeaderProps) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    isActive: item.match(pathname),
  }));

  const headerClass =
    variant === 'details'
      ? 'sticky top-0 z-50 border-b border-slate-200/80 bg-[#fbfaf6]/95 text-slate-950 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-50'
      : 'sticky top-0 z-50 border-b border-slate-200/80 bg-[#fbfaf6]/95 text-slate-950 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-50';

  return (
    <header className={headerClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
        <a className="group inline-flex items-center gap-3" href="/" aria-label="返回首页">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-950 bg-slate-950 font-serif text-lg font-semibold text-white shadow-sm transition-transform group-hover:-rotate-2 dark:border-slate-700 dark:bg-slate-50 dark:text-slate-950">
            AI
          </span>
          <span>
            <span className={BRAND_TITLE_CLASS}>Omni Hub</span>
            <span className="mt-1 block font-label-sm text-[10px] uppercase leading-none tracking-[0.16em] text-slate-500 dark:text-slate-400">
              AI News · Analysis · Tools
            </span>
          </span>
        </a>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <nav
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex-none"
            aria-label="主导航"
          >
            {navItems.map((item) => (
              <a key={item.href} className={getNavLinkClass(item.isActive)} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          {variant === 'home' && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <a
                aria-label="查看分类"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                href="#feed"
              >
                <SearchIcon />
              </a>
              <a
                aria-label="查看工具"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                href="#tools"
              >
                <BookmarkIcon />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
