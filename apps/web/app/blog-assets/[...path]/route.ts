import { handleServerRoute } from '@/app/api/_server';

interface BlogAssetRouteProps {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(request: Request, { params }: BlogAssetRouteProps) {
  const { path: assetPath } = await params;
  return handleServerRoute(request, `/api/blog/assets/${assetPath.map(encodeURIComponent).join('/')}`);
}
