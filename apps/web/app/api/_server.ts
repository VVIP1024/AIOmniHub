import { createServerDependencies, routeRequest } from '@ai-omni-hub/server/http';
import type { ServerResponse } from '@ai-omni-hub/server/types';

const dependencies = createServerDependencies();

function normalizeHeaders(headers: Headers): Record<string, string> {
  const normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  return request.json().catch(() => undefined);
}

function toNextResponse(result: ServerResponse): Response {
  if (result.body === undefined) {
    return new Response(null, {
      status: result.status,
      headers: result.headers,
    });
  }

  if (
    typeof result.body === 'string' ||
    result.body instanceof Blob ||
    result.body instanceof ReadableStream ||
    result.body instanceof Uint8Array
  ) {
    return new Response(result.body as BodyInit, {
      status: result.status,
      headers: result.headers,
    });
  }

  return Response.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function handleServerRoute(request: Request, pathname?: string): Promise<Response> {
  const url = new URL(request.url);
  if (pathname) {
    url.pathname = pathname;
    url.search = '';
  }

  const result = await routeRequest(
    {
      method: request.method,
      url: url.toString(),
      headers: normalizeHeaders(request.headers),
      body: await readBody(request),
    },
    dependencies,
  );

  return toNextResponse(result);
}
