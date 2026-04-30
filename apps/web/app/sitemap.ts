import type { MetadataRoute } from 'next';
import { getBlogPosts } from '@/utils/blog';
import { getAbsoluteUrl } from '@/utils/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getBlogPosts();
  const now = new Date();

  return [
    {
      url: getAbsoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: getAbsoluteUrl('/details'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...posts.map((post) => ({
      url: getAbsoluteUrl(`/blog/${encodeURIComponent(post.slug)}`),
      lastModified: new Date(post.uploadedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
