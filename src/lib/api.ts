/** Cliente HTTP de la API. */
import type { CriterionDef } from '../domain/criteria';
import type { Alternative, AlternativeInput, Profile } from '../domain/types';
import type { SensitivityResult } from '../engine/sensitivity';
import type { TopsisResult } from '../engine/topsis';

export interface Meta {
  criteria: CriterionDef[];
  profiles: Profile[];
  storage: 'postgres' | 'memory';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

const ADMIN_KEY = 'topsis-admin-token';

export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(ADMIN_KEY, token);
  } catch {
    /* almacenamiento no disponible */
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['x-admin-token'] = getAdminToken();
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Error ${res.status}`, data.details);
  return data as T;
}

export const api = {
  meta: () => request<Meta>('GET', '/meta'),
  listAlternatives: () => request<Alternative[]>('GET', '/alternatives'),
  createAlternative: (a: AlternativeInput) => request<Alternative>('POST', '/alternatives', a),
  updateAlternative: (id: number, a: AlternativeInput) => request<Alternative>('PUT', `/alternatives/${id}`, a),
  deleteAlternative: (id: number) => request<void>('DELETE', `/alternatives/${id}`),
  resetAlternatives: () => request<Alternative[]>('POST', '/alternatives/reset'),
  topsis: (weights: number[], alternativeIds?: number[]) =>
    request<{ result: TopsisResult; alternatives: Alternative[] }>('POST', '/topsis', { weights, alternativeIds }),
  sensitivity: (weights: number[], criterionIndex: number, alternativeIds?: number[], steps = 50) =>
    request<{ result: SensitivityResult; alternatives: Alternative[] }>('POST', '/sensitivity', {
      weights,
      alternativeIds,
      criterionIndex,
      steps,
    }),
};
