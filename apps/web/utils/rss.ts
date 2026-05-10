import { createServerDependencies, routeRequest } from '../../server/dist/http/index.js';
import type { Category, HomepageInsights } from '../../server/dist/types.js';

export type { Category, CategoryInsight, HomepageInsights } from '../../server/dist/types.js';

export const categoryOrder: Category[] = [
  'AI Strategy',
  'Tech Trends',
  'Policy & Regulation',
  'Ethics & Governance',
  'Research',
  'Developer Forum',
];

const dependencies = createServerDependencies();

export async function getHomepageInsights(): Promise<HomepageInsights> {
  const response = await routeRequest(
    {
      method: 'GET',
      url: 'http://internal/api/homepage-insights',
      headers: {},
    },
    dependencies,
  );

  return response.status === 200
    ? (response.body as HomepageInsights)
    : {
        'AI Strategy': [],
        'Tech Trends': [],
        'Policy & Regulation': [],
        'Ethics & Governance': [],
        'Research': [],
        'Developer Forum': [],
        'Blog': [],
      };
}
