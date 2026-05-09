import { handleServerRoute } from '../../_server';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleServerRoute(request);
}
