import { get as getBlob, list } from '@vercel/blob';
import type { CategoryInsight } from '@/lib/rss';

const BLOG_PREFIX = 'Blog/';
const BLOG_IMAGE =
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80';

export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  readTime: string;
}

function stripMarkdown(input: string): string {
  return input
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(2, Math.min(12, Math.round(words / 300) || 2));
  return `${minutes} MIN READ`;
}

function toBlogAssetUrl(src: string): string {
  if (src.startsWith('./')) return `/blog-assets/${src.slice(2)}`;
  if (src.startsWith('Blog/')) return `/blog-assets/${src.slice(BLOG_PREFIX.length)}`;
  return src;
}

function extractFirstImage(markdown: string): string | null {
  const match = markdown.match(/!\[[^\]]*]\(([^)]+)\)/);
  return match?.[1] ? toBlogAssetUrl(match[1].trim()) : null;
}

function extractSummaryBlock(lines: string[]): { summary: string | null; contentLines: string[] } {
  const startIndex = lines.findIndex((line) => line.trim().startsWith('>'));
  if (startIndex < 0) {
    return { summary: null, contentLines: lines };
  }

  let endIndex = startIndex;
  while (endIndex < lines.length && lines[endIndex].trim().startsWith('>')) {
    endIndex += 1;
  }

  const summary = lines
    .slice(startIndex, endIndex)
    .map((line) => line.replace(/^>\s?/, '').trim())
    .join(' ')
    .trim();

  return {
    summary: summary || null,
    contentLines: [...lines.slice(0, startIndex), ...lines.slice(endIndex)],
  };
}

function parsePost(slug: string, markdown: string): BlogPost {
  const lines = markdown.split(/\r?\n/);
  const titleLineIndex = lines.findIndex((line) => line.trim().startsWith('# '));
  const title =
    titleLineIndex >= 0
      ? lines[titleLineIndex].replace(/^#\s+/, '').trim()
      : slug;
  const bodyLines =
    titleLineIndex >= 0
      ? [...lines.slice(0, titleLineIndex), ...lines.slice(titleLineIndex + 1)]
      : lines;
  const { summary, contentLines } = extractSummaryBlock(bodyLines);
  const content = contentLines.join('\n').trim();
  const firstParagraph = contentLines.find((line) => line.trim() && !line.trim().startsWith('#'));

  return {
    slug,
    title,
    summary: truncate(stripMarkdown(summary ?? firstParagraph ?? content), 180),
    content,
    image: extractFirstImage(content) ?? BLOG_IMAGE,
    readTime: estimateReadTime(markdown),
  };
}

async function readBlobText(pathname: string): Promise<string | null> {
  try {
    const blob = await getBlob(pathname, { access: 'private' });
    if (!blob?.stream) return null;
    return await new Response(blob.stream).text();
  } catch {
    return null;
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { blobs } = await list({ prefix: BLOG_PREFIX, limit: 1000 });
    const markdownBlobs = blobs
      .filter((blob) => blob.pathname.endsWith('.md'))
      .sort((a, b) => a.pathname.localeCompare(b.pathname, undefined, { numeric: true }));

    const posts = await Promise.all(
      markdownBlobs.map(async (blob) => {
        const slug = blob.pathname.replace(BLOG_PREFIX, '').replace(/\.md$/, '');
        const markdown = await readBlobText(blob.pathname);
        if (!markdown) return null;
        return parsePost(slug, markdown);
      }),
    );

    return posts.filter((post): post is BlogPost => post !== null);
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getBlogInsights(): Promise<CategoryInsight[]> {
  const posts = await getBlogPosts();

  return posts.map((post) => ({
    category: 'Blog',
    title: post.title,
    summary: post.summary,
    link: `/blog/${post.slug}`,
    source: 'Blog',
    publishedAt: '',
    image: post.image,
    readTime: post.readTime,
  }));
}

export async function getBlogAsset(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  const normalizedPathname = pathname
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');

  if (!normalizedPathname) return null;

  try {
    const blob = await getBlob(`${BLOG_PREFIX}${normalizedPathname}`, { access: 'private' });
    return blob?.stream ?? null;
  } catch {
    return null;
  }
}
