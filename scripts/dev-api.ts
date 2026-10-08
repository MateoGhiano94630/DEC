/**
 * Servidor local de la API para desarrollo (sin necesidad de `vercel dev`).
 * Reproduce el ruteo de /api de Vercel sobre los mismos handlers.
 * Vite redirige /api a este servidor (ver vite.config.ts).
 */
import { createServer } from 'node:http';
import type { Handler } from '../server/http.js';
import {
  alternativeByIdHandler,
  alternativesHandler,
  metaHandler,
  resetHandler,
  sensitivityHandler,
  topsisHandler,
} from '../server/handlers.js';
import { getRepository } from '../server/repository.js';

const PORT = Number(process.env.API_PORT ?? 3001);

const routes: [RegExp, Handler][] = [
  [/^\/api\/meta$/, metaHandler],
  [/^\/api\/topsis$/, topsisHandler],
  [/^\/api\/sensitivity$/, sensitivityHandler],
  [/^\/api\/alternatives$/, alternativesHandler],
  [/^\/api\/alternatives\/reset$/, resetHandler],
  [/^\/api\/alternatives\/(?<id>[^/]+)$/, alternativeByIdHandler],
];

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const match = routes.map(([re, h]) => [url.pathname.match(re), h] as const).find(([m]) => m);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Ruta no encontrada.' }));
    return;
  }
  const [m, handler] = match;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'JSON inválido.' }));
    return;
  }
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v[0] : v;
  const query = { ...Object.fromEntries(url.searchParams), ...m!.groups };
  const result = await handler({ method: req.method ?? 'GET', query, headers, body });
  if (result.body === undefined) res.writeHead(result.status).end();
  else res.writeHead(result.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(result.body));
}).listen(PORT, () => {
  console.log(`API local en http://localhost:${PORT} (almacenamiento: ${getRepository().kind})`);
});
