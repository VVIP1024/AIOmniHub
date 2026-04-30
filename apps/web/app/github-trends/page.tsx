import type { Metadata } from 'next';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import GitHubTrendsGraph from '@/features/github-trends/GitHubTrendsGraph';

export const metadata: Metadata = {
  title: 'GitHub 趋势导航仪',
  description: '在浏览器中搜索 GitHub 热门仓库，并用图谱展示项目、作者、语言和标签关系。',
};

export default function GitHubTrendsPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <SiteHeader variant="home" />
      <main className="flex-grow">
        <GitHubTrendsGraph />
      </main>
      <SiteFooter variant="home" />
    </div>
  );
}
