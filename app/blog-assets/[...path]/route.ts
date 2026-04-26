import path from 'path';
import { notFound } from 'next/navigation';
import { getBlogAsset } from '@/lib/blog';

interface BlogAssetRouteProps {
  params: Promise<{
    path: string[];
  }>;
}

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(_request: Request, { params }: BlogAssetRouteProps) {
  const { path: assetPath } = await params;
  const requestedPath = assetPath.join('/');
  const ext = path.extname(requestedPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  if (!contentType) {
    notFound();
  }

  try {
    const stream = await getBlogAsset(requestedPath);
    if (!stream) notFound();

    return new Response(stream, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': contentType,
      },
    });
  } catch {
    notFound();
  }
}
