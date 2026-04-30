import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import HomepageFeed from '@/features/insights/HomepageFeed';
import { getBlogInsights } from '@/utils/blog';
import { categoryOrder, getHomepageInsights } from '@/utils/rss';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export default async function HomePage() {
  const [rssInsights, blogInsights] = await Promise.all([getHomepageInsights(), getBlogInsights()]);
  const insights = {
    ...rssInsights,
    Blog: blogInsights,
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <SiteHeader variant="home" />
      <HomepageFeed categoryOrder={[...categoryOrder, 'Blog']} insights={insights} />
      <SiteFooter variant="home" />
    </div>
  );
}
