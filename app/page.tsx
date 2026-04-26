import HomepageFeed from '@/components/HomepageFeed';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { categoryOrder, getHomepageInsights } from '@/lib/rss';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export default async function HomePage() {
  const insights = await getHomepageInsights();

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <SiteHeader variant="home" />
      <HomepageFeed categoryOrder={categoryOrder} insights={insights} />
      <SiteFooter variant="home" />
    </div>
  );
}
