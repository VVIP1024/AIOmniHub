import { put } from '@vercel/blob';
import type { HomepageInsights } from '@/lib/rss';

const HOMEPAGE_INSIGHTS_BLOB_PATH = 'articles/homepage-insights.json';

interface HomepageInsightsBlobPayload {
  generatedAt: string;
  insights: HomepageInsights;
}

export async function saveHomepageInsightsToBlob(insights: HomepageInsights): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const payload: HomepageInsightsBlobPayload = {
    generatedAt: new Date().toISOString(),
    insights,
  };

  try {
    await put(HOMEPAGE_INSIGHTS_BLOB_PATH, JSON.stringify(payload, null, 2), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } catch {
    // Blob storage should not block page rendering if Vercel storage is unavailable.
  }
}
