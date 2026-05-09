import { handleServerRoute } from '../../../_server';

interface BlogAssetRouteProps {
  params: Promise<{
    path: string[];
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: BlogAssetRouteProps) {
  const { path } = await params;
  return handleServerRoute(request, `/api/blog/assets/${path.map(encodeURIComponent).join('/')}`);
}
