import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import HomepageFeed from '@/features/insights/HomepageFeed';
import { getHomepageData } from '@/utils/rss';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export default async function HomePage() {
  const { navigation, insights } = await getHomepageData();

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <SiteHeader variant="home" />
      <HomepageFeed navigation={navigation} insights={insights} />
      <SiteFooter variant="home" />
    </div>
  );
}
