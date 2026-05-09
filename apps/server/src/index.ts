import { createServer } from 'http';
import { createServerDependencies } from './dependencies.js';
import { routeRequest } from './http/handler.js';

const port = Number(process.env.PORT || 4000);
const dependencies = createServerDependencies();

const server = createServer(async (request, response) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  const contentType = request.headers['content-type'] ?? '';
  const body = rawBody && contentType.includes('application/json') ? JSON.parse(rawBody) : undefined;
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value]),
  );

  const result = await routeRequest(
    {
      method: request.method ?? 'GET',
      url: new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).toString(),
      headers,
      body,
    },
    dependencies,
  );

  response.writeHead(result.status, result.headers);
  if (result.body === undefined) {
    response.end();
    return;
  }

  if (typeof result.body === 'string' || Buffer.isBuffer(result.body) || result.body instanceof Uint8Array) {
    response.end(result.body);
    return;
  }

  response.end(JSON.stringify(result.body));
});

server.listen(port, () => {
  console.log(`AIOmniHub BFF server listening on http://localhost:${port}`);
});
