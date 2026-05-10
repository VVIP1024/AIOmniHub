import { createServerDependencies, routeRequest } from '@ai-omni-hub/server/http';
import type { Category, HomepageData, HomepageInsights } from '@ai-omni-hub/server/types';

export type {
  Category,
  CategoryInsight,
  HomepageData,
  HomepageInsights,
  SourceNavigationCategory,
} from '@ai-omni-hub/server/types';

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
  return (await getHomepageData()).insights;
}

export async function getHomepageData(): Promise<HomepageData> {
  const response = await routeRequest(
    {
      method: 'GET',
      url: 'http://internal/api/homepage-insights',
      headers: {},
    },
    dependencies,
  );

  return response.status === 200
    ? (response.body as HomepageData)
    : {
        navigation: [],
        insights: {
          'AI Strategy': [],
          'Tech Trends': [],
          'Policy & Regulation': [],
          'Ethics & Governance': [],
          Research: [],
          'Developer Forum': [],
          Blog: [],
        },
      };
}
