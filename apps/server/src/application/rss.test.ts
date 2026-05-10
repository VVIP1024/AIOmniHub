import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCategoryInsights } from './rss.js';
import type { FeedSourceGroup } from '../types.js';

test('uses pollinations image generated from title when feed item has no image', async () => {
  const groups: FeedSourceGroup[] = [
    {
      sources: [{ name: 'OpenAI', url: 'https://example.com/openai.xml' }],
    },
  ];

  const insights = await fetchCategoryInsights('AI Strategy', groups, {
    parseFeed: async () => ({
      items: [
        {
          title: 'Running Codex safely at OpenAI',
          link: 'https://openai.com/index/running-codex-safely',
          contentSnippet: 'summary',
          isoDate: '2026-05-10T00:00:00.000Z',
        },
      ],
    }),
  });

  assert.equal(
    insights[0]?.image,
    'https://image.pollinations.ai/prompt/Running%20Codex%20safely%20at%20OpenAI',
  );
});

test('does not truncate source group results without an explicit limit', async () => {
  const groups: FeedSourceGroup[] = [
    {
      group: 'OpenAI',
      sources: [{ name: 'OpenAI', url: 'https://example.com/openai.xml' }],
    },
  ];

  const insights = await fetchCategoryInsights('AI Strategy', groups, {
    parseFeed: async (url: string) => ({
      items: Array.from({ length: 10 }, (_, index) => ({
        title: `${url} item ${index + 1}`,
        link: `${url}#${index + 1}`,
        contentSnippet: 'summary',
        isoDate: `2026-05-${String(10 - index).padStart(2, '0')}T00:00:00.000Z`,
      })),
    }),
  });

  assert.equal(insights.length, 10);
});

test('keeps results from every source group when applying limits', async () => {
  const groups: FeedSourceGroup[] = [
    {
      group: 'OpenAI',
      sources: [{ name: 'OpenAI', url: 'https://example.com/openai.xml' }],
    },
    {
      group: 'Google',
      sources: [{ name: 'Google', url: 'https://example.com/google.xml' }],
    },
    {
      group: 'HuggingFace',
      sources: [{ name: 'HuggingFace', url: 'https://example.com/huggingface.xml' }],
    },
  ];

  const insights = await fetchCategoryInsights('AI Strategy', groups, {
    limit: 2,
    parseFeed: async (url: string) => ({
      items: [
        {
          title: `${url} item 1`,
          link: `${url}#1`,
          contentSnippet: 'summary',
          isoDate: '2026-05-10T00:00:00.000Z',
        },
        {
          title: `${url} item 2`,
          link: `${url}#2`,
          contentSnippet: 'summary',
          isoDate: '2026-05-09T00:00:00.000Z',
        },
      ],
    }),
  });

  assert.deepEqual(new Set(insights.map((item) => item.sourceGroup)), new Set(['OpenAI', 'Google', 'HuggingFace']));
  assert.equal(insights.length, 6);
});

test('logs feed failures and continues with healthy sources', async () => {
  const warnings: unknown[][] = [];
  const groups: FeedSourceGroup[] = [
    {
      group: 'OpenAI',
      sources: [
        { name: 'Broken', url: 'https://example.com/broken.xml' },
        { name: 'Healthy', url: 'https://example.com/healthy.xml' },
      ],
    },
  ];

  const insights = await fetchCategoryInsights('AI Strategy', groups, {
    logger: {
      warn: (...args: unknown[]) => warnings.push(args),
    },
    parseFeed: async (url: string) => {
      if (url.includes('broken')) {
        throw new Error('Status code 404');
      }

      return {
        items: [
          {
            title: 'Healthy item',
            link: 'https://example.com/healthy-item',
            contentSnippet: 'summary',
            isoDate: '2026-05-10T00:00:00.000Z',
          },
        ],
      };
    },
  });

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.source, 'Healthy');
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]?.[0]), /Failed to fetch RSS source/);
  assert.match(String(warnings[0]?.[1]), /Broken/);
  assert.match(String(warnings[0]?.[1]), /Status code 404/);
});
