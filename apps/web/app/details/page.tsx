import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

export default function DetailsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf6] text-slate-950">
      <SiteHeader variant="details" />

      <main className="w-full flex-grow">
        <article className="mx-auto max-w-[780px] px-4 py-xxl md:px-0">
          <a
            className="mb-xl inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 font-nav-link text-[14px] font-semibold text-slate-600 transition-colors hover:text-slate-950"
            href="/"
          >
            返回情报流
          </a>

          <div className="mb-xl border-b border-slate-200 pb-xl">
            <span className="inline-flex rounded-lg bg-[#ecf3ff] px-3 py-1 font-label-sm text-[11px] text-[#2170e4]">
              站点说明
            </span>
            <h1 className="mt-md font-h1 text-[48px] leading-tight text-slate-950 md:text-[60px]">
              AI Omni Hub 的信息架构说明
            </h1>
            <p className="mt-md font-body-lg text-[20px] leading-9 text-slate-600">
              这个页面用于说明门户如何组织 AI 资讯、深度文章和实用工具，方便后续继续扩展更多内容入口。
            </p>
          </div>

          <div className="space-y-xl">
            <section>
              <h2 className="font-h2 text-[32px] leading-tight text-slate-950">核心模块</h2>
              <p className="mt-sm font-body-md text-[16px] leading-8 text-slate-600">
                首页以“情报流”为主入口，按战略观察、技术趋势、政策合规、伦理治理、研究数据和深度文章组织内容。用户进入页面后可以先扫最新更新，再按主题筛选。
              </p>
            </section>

            <section>
              <h2 className="font-h2 text-[32px] leading-tight text-slate-950">工具入口</h2>
              <p className="mt-sm font-body-md text-[16px] leading-8 text-slate-600">
                “文档智问”和“开源雷达”作为独立工具保留在主导航中，同时在首页工具区重复出现，减少用户在资讯和行动之间的跳转成本。
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-lg">
              <h2 className="font-h2 text-[32px] leading-tight text-slate-950">命名原则</h2>
              <p className="mt-sm font-body-md text-[16px] leading-8 text-slate-600">
                菜单使用短中文名，优先表达用户能获得什么信息与能力，避免把内部采集、存储和检索实现暴露成前台卖点。
              </p>
            </section>
          </div>
        </article>
      </main>

      <SiteFooter variant="details" />
    </div>
  );
}
