import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { getBlogPost } from '@/lib/blog';
import { getAbsoluteUrl } from '@/lib/site';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = 'force-dynamic';

function getBlogKeywords(title: string): string[] {
  const titleKeywords = title
    .split(/[\s:：,，、。！？?《》“”"()（）]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 1);

  return Array.from(new Set([...titleKeywords, 'AI', '人工智能', 'AI 工具', 'AI 资讯']));
}

function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Blog article not found',
    };
  }

  const canonicalPath = `/blog/${encodeURIComponent(post.slug)}`;
  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const imageUrl = getAbsoluteUrl(post.image);

  return {
    title: post.title,
    description: post.summary,
    keywords: getBlogKeywords(post.title),
    authors: [{ name: 'Intellect & Insight' }],
    creator: 'Intellect & Insight',
    publisher: 'Intellect & Insight',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: canonicalUrl,
      siteName: 'Intellect & Insight',
      type: 'article',
      publishedTime: post.uploadedAt,
      images: [
        {
          url: imageUrl,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) notFound();

  const canonicalPath = `/blog/${encodeURIComponent(post.slug)}`;
  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const imageUrl = getAbsoluteUrl(post.image);
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    image: [imageUrl],
    datePublished: post.uploadedAt,
    dateModified: post.uploadedAt,
    author: {
      '@type': 'Organization',
      name: 'Intellect & Insight',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Intellect & Insight',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <SiteHeader variant="details" />

      <main className="flex-grow w-full pt-8 pb-xxl">
        <article className="max-w-[720px] mx-auto px-4 md:px-0 markdown-content">
          <div className="mb-12">
            <span className="inline-block bg-surface-container px-3 py-1 rounded font-label-sm text-label-sm text-on-surface-variant mb-4">
              BLOG
            </span>
            <h1>{post.title}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant italic mb-0">
              {post.readTime}
            </p>
          </div>

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src = '', alt = '' }) => {
                const imageSrc = src.startsWith('./') ? `/blog-assets/${src.slice(2)}` : src;
                return (
                  <img
                    src={imageSrc}
                    alt={alt}
                    className="my-8 w-full rounded-xl border border-outline-variant object-cover"
                  />
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </article>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(articleJsonLd) }}
      />

      <SiteFooter variant="details" />
    </div>
  );
}
