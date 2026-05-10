import type { BlobPutInput, ServerDependencies, ServerRequest, ServerResponse } from '../types.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function json(status: number, body: unknown, headers: Record<string, string> = {}): ServerResponse {
  return {
    status,
    body,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  };
}

function getHeader(request: ServerRequest, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  return request.headers[lowerName] ?? request.headers[name];
}

function parseNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function isAuthorized(request: ServerRequest, token?: string): boolean {
  if (!token) return false;
  return getHeader(request, 'authorization') === `Bearer ${token}`;
}

function parseBlobPutInput(body: unknown): BlobPutInput | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Partial<BlobPutInput>;
  if (typeof input.pathname !== 'string' || !input.pathname.trim()) return null;
  if (typeof input.content !== 'string') return null;

  return {
    pathname: input.pathname.trim(),
    content: input.content,
    contentType: typeof input.contentType === 'string' ? input.contentType : undefined,
  };
}

function parseBlobPathname(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as { pathname?: unknown };
  return typeof input.pathname === 'string' && input.pathname.trim() ? input.pathname.trim() : null;
}

export async function routeRequest(
  request: ServerRequest,
  dependencies: ServerDependencies,
): Promise<ServerResponse> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === 'GET' && url.pathname === '/api/homepage-insights') {
      return json(200, await dependencies.blog.getHomepageData(), {
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
      });
    }

    if (method === 'GET' && url.pathname === '/api/blog/posts') {
      return json(200, { items: await dependencies.blog.getPosts() });
    }

    if (method === 'GET' && url.pathname.startsWith('/api/blog/posts/')) {
      const slug = decodeURIComponent(url.pathname.replace('/api/blog/posts/', ''));
      const post = await dependencies.blog.getPost(slug);
      return post ? json(200, post) : json(404, { error: 'Blog post not found' });
    }

    if (method === 'GET' && url.pathname.startsWith('/api/blog/assets/')) {
      const pathname = decodeURIComponent(url.pathname.replace('/api/blog/assets/', ''));
      const asset = await dependencies.blog.getAsset(pathname);
      if (!asset) return json(404, { error: 'Blog asset not found' });

      return {
        status: 200,
        body: asset.body,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': asset.contentType,
        },
      };
    }

    if (method === 'GET' && url.pathname === '/api/github-trends') {
      const days = parseNumber(url.searchParams.get('days'), 30, 1, 365);
      const minStars = parseNumber(url.searchParams.get('minStars'), 100, 0, 1_000_000);
      const limit = parseNumber(url.searchParams.get('limit'), 30, 1, 100);
      const industry = url.searchParams.get('industry') ?? 'all';
      return json(200, await dependencies.githubTrends.fetch({ days, minStars, limit, industry }), {
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
      });
    }

    if (method === 'GET' && url.pathname === '/api/ai/chat/config') {
      return json(200, dependencies.aiChat.getConfig());
    }

    if (method === 'POST' && url.pathname === '/api/ai/chat') {
      return json(200, await dependencies.aiChat.generate((request.body ?? {}) as never));
    }

    if (url.pathname === '/api/blob' && (method === 'POST' || method === 'DELETE')) {
      if (!isAuthorized(request, dependencies.config.blobAdminToken)) {
        return json(401, { error: 'Unauthorized' });
      }

      if (method === 'POST') {
        const input = parseBlobPutInput(request.body);
        if (!input) return json(400, { error: 'Invalid blob payload' });
        return json(201, await dependencies.blobAdmin.put(input));
      }

      const pathname = parseBlobPathname(request.body);
      if (!pathname) return json(400, { error: 'Invalid blob payload' });
      return json(200, await dependencies.blobAdmin.delete(pathname));
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server request failed';
    return json(502, { error: message });
  }
}
