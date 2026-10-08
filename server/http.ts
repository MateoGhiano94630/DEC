/**
 * Capa HTTP independiente del proveedor. Los handlers reciben un ApiRequest y
 * devuelven un ApiResponse; `toVercel` los adapta a funciones serverless de
 * Vercel y scripts/dev-api.ts los monta en un servidor local.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';
import { TopsisValidationError } from '../src/engine/topsis.js';

export interface ApiRequest {
  method: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body?: unknown;
}

export type Handler = (req: ApiRequest) => Promise<ApiResponse>;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const ok = (body: unknown, status = 200): ApiResponse => ({ status, body });

/** Despacha según el método HTTP y traduce las excepciones conocidas a códigos de estado. */
export function route(methods: Partial<Record<string, Handler>>): Handler {
  return async (req) => {
    const handler = methods[req.method];
    if (!handler) return { status: 405, body: { error: `Método ${req.method} no permitido.` } };
    try {
      return await handler(req);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): ApiResponse {
  if (err instanceof HttpError) return { status: err.status, body: { error: err.message, details: err.details } };
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { error: 'Datos inválidos.', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
    };
  }
  if (err instanceof TopsisValidationError) return { status: 422, body: { error: err.message } };
  console.error(err);
  return { status: 500, body: { error: 'Error interno del servidor.' } };
}

/** Las operaciones de escritura exigen ADMIN_TOKEN si está configurado en el entorno. */
export function requireAdmin(req: ApiRequest): void {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    throw new HttpError(401, 'Se requiere la clave de administración para modificar los modelos.');
  }
}

export function toVercel(handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const query: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.query)) query[k] = Array.isArray(v) ? v[0] : v;
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    const result = await handler({ method: req.method ?? 'GET', query, headers, body: req.body ?? null });
    res.setHeader('Cache-Control', 'no-store');
    if (result.body === undefined) res.status(result.status).end();
    else res.status(result.status).json(result.body);
  };
}
