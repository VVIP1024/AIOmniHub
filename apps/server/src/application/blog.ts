import { get as getBlob, list } from '@vercel/blob';
import fs from 'fs/promises';
import matter from 'gray-matter';
import path from 'path';
import { getLocalStoragePath, shouldUseVercelStorage } from '../config/storage-env.js';
import { getPollinationsImageUrl, getRssHomepageData } from './rss.js';
import type { BlogAsset, BlogPost, CategoryInsight, HomepageData, HomepageInsights } from '../types.js';

const VERCEL_BLOG_PREFIX = 'Blog/';
const LOCAL_BLOG_DIR = 'Blob';
const LOCAL_BLOG_PREFIX = `${LOCAL_BLOG_DIR}/`;

interface BlogMarkdownBlob {
  pathname: string;
  prefix: string;
  uploadedAt: Date;
}

interface BlogFrontmatter {
  title?: unknown;
  description?: unknown;
  keywords?: unknown;
  tags?: unknown;
}

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(2, Math.min(12, Math.round(words / 300) || 2));
  return `${minutes} MIN READ`;
}

function toCleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toFrontmatterStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function parsePost(slug: string, markdown: string, uploadedAt: Date): BlogPost | null {
  if (!markdown.trimStart().startsWith('---')) return null;

  const parsed = matter(markdown);
  const frontmatter = parsed.data as BlogFrontmatter;
  const body = parsed.content.trim();
  const title = toCleanString(frontmatter.title);
  const description = toCleanString(frontmatter.description);
  const keywords = toFrontmatterStringArray(frontmatter.keywords);
  const tags = toFrontmatterStringArray(frontmatter.tags);

  if (!title || !description || !keywords || !tags) return null;

  return {
    slug,
    title,
    description,
    keywords,
    tags,
    summary: description,
    content: body,
    image: getPollinationsImageUrl(title),
    uploadedAt: uploadedAt.toISOString(),
    readTime: estimateReadTime(body),
  };
}

function getLocalBlogRoot(): string {
  return getLocalStoragePath('blob', LOCAL_BLOG_DIR);
}

function toLocalBlobPath(pathname: string): string {
  const relativePathname = pathname.startsWith(LOCAL_BLOG_PREFIX) ? pathname.slice(LOCAL_BLOG_PREFIX.length) : pathname;
  return path.join(getLocalBlogRoot(), relativePathname);
}

async function readLocalBlobText(pathname: string): Promise<string | null> {
  try {
    return await fs.readFile(toLocalBlobPath(pathname), 'utf8');
  } catch {
    return null;
  }
}

async function readBlobText(pathname: string): Promise<string | null> {
  if (!shouldUseVercelStorage()) return readLocalBlobText(pathname);

  try {
    const blob = await getBlob(pathname, { access: 'private' });
    if (!blob?.stream) return null;
    return await new Response(blob.stream).text();
  } catch {
    return null;
  }
}

async function listLocalBlogMarkdownBlobs(directory = getLocalBlogRoot()): Promise<BlogMarkdownBlob[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const markdownBlobs = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listLocalBlogMarkdownBlobs(entryPath);
      if (!entry.isFile() || !entry.name.endsWith('.md')) return [];

      const stat = await fs.stat(entryPath);
      const relativePathname = path.relative(getLocalBlogRoot(), entryPath).split(path.sep).join('/');
      return [
        {
          pathname: `${LOCAL_BLOG_PREFIX}${relativePathname}`,
          prefix: LOCAL_BLOG_PREFIX,
          uploadedAt: stat.mtime,
        },
      ];
    }),
  );

  return markdownBlobs.flat();
}

async function listVercelBlogMarkdownBlobs(): Promise<BlogMarkdownBlob[]> {
  const markdownBlobs: BlogMarkdownBlob[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: VERCEL_BLOG_PREFIX,
      limit: 1000,
      cursor,
    });

    markdownBlobs.push(
      ...result.blobs
        .filter((blob) => blob.pathname.endsWith('.md'))
        .map((blob) => ({
          pathname: blob.pathname,
          prefix: VERCEL_BLOG_PREFIX,
          uploadedAt: blob.uploadedAt,
        })),
    );

    cursor = result.cursor;
  } while (cursor);

  return markdownBlobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

async function listBlogMarkdownBlobs(): Promise<BlogMarkdownBlob[]> {
  if (!shouldUseVercelStorage()) {
    try {
      const markdownBlobs = await listLocalBlogMarkdownBlobs();
      return markdownBlobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch {
      return [];
    }
  }

  return listVercelBlogMarkdownBlobs();
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const markdownBlobs = await listBlogMarkdownBlobs();
  const posts = await Promise.all(
    markdownBlobs.map(async (blob) => {
      const slug = blob.pathname.replace(blob.prefix, '').replace(/\.md$/, '');
      const markdown = await readBlobText(blob.pathname);
      if (!markdown) return null;
      return parsePost(slug, markdown, blob.uploadedAt);
    }),
  );

  return posts.filter((post): post is BlogPost => post !== null);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const decodedSlug = decodeURIComponent(slug);
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === decodedSlug) ?? null;
}

export async function getBlogInsights(): Promise<CategoryInsight[]> {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    category: 'Blog',
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

export async function getBlogAsset(pathname: string): Promise<BlogAsset | null> {
  const normalizedPathname = pathname
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
  const contentType = CONTENT_TYPES[path.extname(normalizedPathname).toLowerCase()];

  if (!normalizedPathname || !contentType) return null;

  try {
    if (!shouldUseVercelStorage()) {
      return {
        body: await fs.readFile(path.join(getLocalBlogRoot(), normalizedPathname)),
        contentType,
      };
    }

    const blob = await getBlob(`${VERCEL_BLOG_PREFIX}${normalizedPathname}`, { access: 'private' });
    return blob?.stream ? { body: blob.stream, contentType } : null;
  } catch {
    return null;
  }
}

export async function getHomepageInsights(): Promise<HomepageInsights> {
  const [rssData, blogInsights] = await Promise.all([getRssHomepageData(), getBlogInsights()]);
  return {
    ...rssData.insights,
    Blog: blogInsights,
  };
}

export async function getHomepageData(): Promise<HomepageData> {
  const [rssData, blogInsights] = await Promise.all([getRssHomepageData(), getBlogInsights()]);
  return {
    navigation: [
      ...rssData.navigation,
      {
        category: 'Blog',
        groups: [],
      },
    ],
    insights: {
      ...rssData.insights,
      Blog: blogInsights,
    },
  };
}
