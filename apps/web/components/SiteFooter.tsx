type FooterVariant = 'home' | 'details';

interface SiteFooterProps {
  variant: FooterVariant;
}

const footerLinks = [
  { href: '/', label: '情报流' },
  { href: '/#articles', label: '深度文章' },
  { href: '/doc-chat', label: '文档智问' },
  { href: '/github-trends', label: '开源雷达' },
];

export default function SiteFooter({ variant }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-[#111827] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-lg px-4 py-xl md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <div className="inline-flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white text-sm font-semibold text-slate-950">
              AI
            </span>
            <span>
              <span className="block font-serif text-[24px] font-semibold leading-none">Omni Hub</span>
              <span className="mt-1 block font-label-sm text-[10px] uppercase leading-none tracking-[0.16em] text-slate-400">
                AI News · Analysis · Tools
              </span>
            </span>
          </div>
          <p className="mt-md max-w-[520px] font-body-md text-[14px] leading-7 text-slate-300">
            {variant === 'details'
              ? '持续沉淀 AI 资讯、深度文章和实用工具，帮助研究与决策保持同一套上下文。'
              : '面向 AI 研究、产品判断和技术选型的资讯门户。'}
          </p>
        </div>

        <nav className="flex flex-wrap items-start gap-2 md:justify-end" aria-label="页脚导航">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              className="rounded-lg border border-white/10 px-3 py-2 font-nav-link text-[13px] font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
