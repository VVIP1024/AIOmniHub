import assert from 'node:assert/strict';
import test from 'node:test';
import { routeRequest } from './handler.js';
import type { ServerDependencies } from '../types.js';

function createDependencies(): ServerDependencies {
  return {
    config: {
      blobAdminToken: 'secret-token',
    },
    githubTrends: {
      fetch: async () => ({ items: [{ id: 1, name: 'demo' }] }),
    },
    aiChat: {
      getConfig: () => ({
        provider: 'vercel',
        model: 'openai/gpt-4o-mini',
        baseUrlConfigured: false,
        maxOutputTokens: 1200,
        temperature: 0.3,
      }),
      generate: async () => ({
        text: 'hello',
        provider: 'vercel',
        model: 'openai/gpt-4o-mini',
      }),
    },
    blog: {
      getHomepageInsights: async () => ({
        'AI Strategy': [],
        'Tech Trends': [],
        'Policy & Regulation': [],
        'Ethics & Governance': [],
        'Research': [],
        Blog: [],
      }),
      getPosts: async () => [
        {
          slug: 'demo',
          title: 'Demo',
          description: 'Demo post',
          keywords: ['demo'],
          tags: ['demo'],
          summary: 'Demo post',
          content: 'Hello',
          image: 'https://example.com/image.jpg',
          uploadedAt: '2026-05-10T00:00:00.000Z',
          readTime: '2 MIN READ',
        },
      ],
      getPost: async (slug) =>
        slug === 'demo'
          ? {
              slug: 'demo',
              title: 'Demo',
              description: 'Demo post',
              keywords: ['demo'],
              tags: ['demo'],
              summary: 'Demo post',
              content: 'Hello',
              image: 'https://example.com/image.jpg',
              uploadedAt: '2026-05-10T00:00:00.000Z',
              readTime: '2 MIN READ',
            }
          : null,
      getAsset: async () => ({
        body: new Uint8Array([1, 2, 3]),
        contentType: 'image/png',
      }),
    },
    blobAdmin: {
      put: async (input) => ({
        pathname: input.pathname,
        url: `https://blob.example/${input.pathname}`,
      }),
      delete: async (pathname) => ({ pathname, deleted: true }),
    },
  };
}

test('routes GitHub trends through the server handler', async () => {
  const response = await routeRequest(
    {
      method: 'GET',
      url: 'http://localhost/api/github-trends?days=7&minStars=50&limit=5&industry=ai',
      headers: {},
    },
    createDependencies(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { items: [{ id: 1, name: 'demo' }] });
});

test('returns a blog post by slug', async () => {
  const response = await routeRequest(
    {
      method: 'GET',
      url: 'http://localhost/api/blog/posts/demo',
      headers: {},
    },
    createDependencies(),
  );

  assert.equal(response.status, 200);
  assert.equal((response.body as { slug: string }).slug, 'demo');
});

test('rejects blob writes without admin authorization', async () => {
  const response = await routeRequest(
    {
      method: 'POST',
      url: 'http://localhost/api/blob',
      headers: {},
      body: {
        pathname: 'Blog/demo.md',
        content: 'hello',
      },
    },
    createDependencies(),
  );

  assert.equal(response.status, 401);
});

test('creates a blob with admin authorization', async () => {
  const response = await routeRequest(
    {
      method: 'POST',
      url: 'http://localhost/api/blob',
      headers: {
        authorization: 'Bearer secret-token',
      },
      body: {
        pathname: 'Blog/demo.md',
        content: 'hello',
        contentType: 'text/markdown',
      },
    },
    createDependencies(),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    pathname: 'Blog/demo.md',
    url: 'https://blob.example/Blog/demo.md',
  });
});

test('deletes a blob with admin authorization', async () => {
  const response = await routeRequest(
    {
      method: 'DELETE',
      url: 'http://localhost/api/blob',
      headers: {
        authorization: 'Bearer secret-token',
      },
      body: {
        pathname: 'Blog/demo.md',
      },
    },
    createDependencies(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    pathname: 'Blog/demo.md',
    deleted: true,
  });
});
