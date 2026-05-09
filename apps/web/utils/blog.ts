import { createServerDependencies, routeRequest } from '../../server/dist/http/index.js';
import type { BlogPost, CategoryInsight } from '../../server/dist/types.js';

export type { BlogPost } from '../../server/dist/types.js';

const dependencies = createServerDependencies();

async function requestServer<T>(path: string): Promise<T | null> {
  const response = await routeRequest(
    {
      method: 'GET',
      url: `http://internal${path}`,
      headers: {},
    },
    dependencies,
  );

  return response.status >= 200 && response.status < 300 ? (response.body as T) : null;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const response = await requestServer<{ items: BlogPost[] }>('/api/blog/posts');
  return response?.items ?? [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return requestServer<BlogPost>(`/api/blog/posts/${encodeURIComponent(slug)}`);
}

export async function getBlogInsights(): Promise<CategoryInsight[]> {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    category: 'Blog' as const,
    title: post.title,
    summary: post.summary,
    link: `/blog/${encodeURIComponent(post.slug)}`,
    source: 'Blog',
    publishedAt: post.uploadedAt,
    image: post.image,
    readTime: post.readTime,
    tags: post.tags,
  }));
}
