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

export default function SiteHeader({ variant }: SiteHeaderProps) {
  if (variant === 'details') {
    return (
      <nav className="bg-white dark:bg-slate-950 font-serif text-lg leading-relaxed full-width top-0 sticky z-50 border-b border-slate-100 dark:border-slate-800 flat no shadows">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 py-6 w-full">
          <div className="font-serif italic font-bold text-2xl tracking-tight text-slate-900 dark:text-slate-50">
            ConsultAI
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a
              className="text-slate-900 dark:text-white font-bold border-b-2 border-slate-900 dark:border-white pb-1 duration-200 ease-out"
              href="#"
            >
              AI Insights
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 ease-out"
            href="/doc-chat"
            >
              Resource Library
            </a>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <header className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-serif newsreader tracking-tight docked full-width top-0 border-b border-slate-200 dark:border-slate-800 flat no shadows sticky z-50">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <div className="text-2xl font-semibold tracking-tighter text-slate-900 dark:text-slate-50 font-serif">
          Intellect &amp; Insight
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <a
            className="text-slate-900 dark:text-slate-50 font-bold border-b-2 border-slate-900 dark:border-slate-50 pb-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors opacity-80 duration-150"
            href="#"
          >
            Insights
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-[11px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            href="/doc-chat"
          >
            Library
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-[11px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            href="#"
          >
            Network
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-[11px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            href="#"
          >
            About
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            aria-label="search"
            className="inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent p-0 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200"
            type="button"
          >
            <SearchIcon />
          </button>
          <button
            aria-label="bookmark"
            className="inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent p-0 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200"
            type="button"
          >
            <BookmarkIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
