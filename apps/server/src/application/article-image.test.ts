import assert from 'node:assert/strict';
import test from 'node:test';
import { createArticleImageResolver } from './article-image.js';

test('resolves article image from Open Graph metadata', async () => {
  const resolveArticleImage = createArticleImageResolver({
    fetchHtml: async () => '<html><head><meta property="og:image" content="https://example.com/cover.jpg"></head></html>',
    delay: async () => undefined,
    now: () => 0,
  });

  const result = await resolveArticleImage('https://example.com/article');

  assert.deepEqual(result, {
    image: 'https://example.com/cover.jpg',
    cached: false,
  });
});

test('caches article image lookups by URL', async () => {
  let calls = 0;
  const resolveArticleImage = createArticleImageResolver({
    fetchHtml: async () => {
      calls += 1;
      return '<meta name="twitter:image" content="https://example.com/twitter.jpg">';
    },
    delay: async () => undefined,
    now: () => 0,
  });

  await resolveArticleImage('https://example.com/article');
  const second = await resolveArticleImage('https://example.com/article');

  assert.equal(calls, 1);
  assert.deepEqual(second, {
    image: 'https://example.com/twitter.jpg',
    cached: true,
  });
});

test('serializes uncached article image fetches with a delay between requests', async () => {
  let currentTime = 0;
  const fetchStarts: number[] = [];
  const delays: number[] = [];
  const resolveArticleImage = createArticleImageResolver({
    fetchHtml: async () => {
      fetchStarts.push(currentTime);
      return '<meta property="og:image" content="https://example.com/cover.jpg">';
    },
    delay: async (ms) => {
      delays.push(ms);
      currentTime += ms;
    },
    now: () => currentTime,
    intervalMs: 3000,
  });

  await Promise.all([
    resolveArticleImage('https://example.com/a'),
    resolveArticleImage('https://example.com/b'),
  ]);

  assert.deepEqual(fetchStarts, [0, 3000]);
  assert.deepEqual(delays, [3000]);
});
