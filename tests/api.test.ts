import { beforeEach, describe, expect, it } from 'vitest';
import type { ApiRequest } from '../server/http.js';
import {
  alternativeByIdHandler,
  alternativesHandler,
  metaHandler,
  resetHandler,
  sensitivityHandler,
  topsisHandler,
} from '../server/handlers.js';
import { MemoryRepository, setRepository } from '../server/repository.js';
import { SEED_ALTERNATIVES } from '../src/domain/seed.js';
import { PROFILES } from '../src/domain/profiles.js';
import type { Alternative } from '../src/domain/types.js';
import type { TopsisResult } from '../src/engine/topsis.js';

const req = (method: string, body: unknown = null, query: Record<string, string> = {}, headers: Record<string, string> = {}): ApiRequest => ({
  method,
  body,
  query,
  headers,
});

const newModel = { ...SEED_ALTERNATIVES[0], name: 'Modelo de prueba', variant: 'test' };

beforeEach(() => {
  setRepository(new MemoryRepository());
  delete process.env.ADMIN_TOKEN;
});

describe('GET /api/meta', () => {
  it('devuelve criterios y perfiles', async () => {
    const res = await metaHandler(req('GET'));
    const body = res.body as { criteria: unknown[]; profiles: unknown[] };
    expect(res.status).toBe(200);
    expect(body.criteria).toHaveLength(6);
    expect(body.profiles).toHaveLength(PROFILES.length);
  });
});

describe('ABM de modelos', () => {
  it('lista los modelos semilla', async () => {
    const res = await alternativesHandler(req('GET'));
    expect((res.body as Alternative[]).length).toBe(SEED_ALTERNATIVES.length);
  });

  it('crea, modifica y elimina', async () => {
    const created = await alternativesHandler(req('POST', newModel));
    expect(created.status).toBe(201);
    const id = String((created.body as Alternative).id);

    const updated = await alternativeByIdHandler(req('PUT', { ...newModel, outputSpeed: 999 }, { id }));
    expect((updated.body as Alternative).outputSpeed).toBe(999);

    expect((await alternativeByIdHandler(req('DELETE', null, { id }))).status).toBe(204);
    expect((await alternativeByIdHandler(req('GET', null, { id }))).status).toBe(404);
  });

  it('rechaza datos inválidos con 400', async () => {
    const res = await alternativesHandler(req('POST', { ...newModel, privacyScore: 7, priceInput: -1 }));
    expect(res.status).toBe(400);
    expect((res.body as { details: unknown[] }).details.length).toBe(2);
  });

  it('rechaza duplicados con 409', async () => {
    const res = await alternativesHandler(req('POST', { ...newModel, name: SEED_ALTERNATIVES[0].name, variant: SEED_ALTERNATIVES[0].variant }));
    expect(res.status).toBe(409);
  });

  it('exige la clave de administración si ADMIN_TOKEN está configurado', async () => {
    process.env.ADMIN_TOKEN = 'secreto';
    expect((await alternativesHandler(req('POST', newModel))).status).toBe(401);
    expect((await alternativesHandler(req('POST', newModel, {}, { 'x-admin-token': 'secreto' }))).status).toBe(201);
    expect((await alternativesHandler(req('GET'))).status).toBe(200);
  });

  it('restablece los datos semilla', async () => {
    await alternativeByIdHandler(req('DELETE', null, { id: '1' }));
    const res = await resetHandler(req('POST'));
    expect((res.body as Alternative[]).length).toBe(SEED_ALTERNATIVES.length);
  });

  it('responde 405 a métodos no soportados', async () => {
    expect((await alternativesHandler(req('PATCH'))).status).toBe(405);
  });
});

describe('POST /api/topsis', () => {
  it('evalúa todos los modelos con un perfil', async () => {
    const res = await topsisHandler(req('POST', { weights: PROFILES[1].weights }));
    expect(res.status).toBe(200);
    const { result } = res.body as { result: TopsisResult };
    expect(result.ranking).toHaveLength(SEED_ALTERNATIVES.length);
    expect(result.matrix[0][0]).toBe(8); // C1 de Claude Opus 5.5 = (3·4 + 20) / 4
  });

  it('evalúa un subconjunto', async () => {
    const res = await topsisHandler(req('POST', { weights: PROFILES[0].weights, alternativeIds: [1, 3, 6] }));
    expect((res.body as { result: TopsisResult }).result.alternatives).toEqual(['Claude Opus 5.5', 'Gemini 3.8 Flash', 'DeepSeek V4.1 Flash']);
  });

  it('rechaza pesos que no suman 1', async () => {
    expect((await topsisHandler(req('POST', { weights: [0.5, 0.5, 0.5, 0, 0, 0] }))).status).toBe(400);
  });

  it('rechaza ids inexistentes', async () => {
    expect((await topsisHandler(req('POST', { weights: PROFILES[0].weights, alternativeIds: [1, 999] }))).status).toBe(404);
  });
});

describe('POST /api/sensitivity', () => {
  it('devuelve la curva de un criterio', async () => {
    const res = await sensitivityHandler(req('POST', { weights: PROFILES[0].weights, criterionIndex: 0, steps: 20 }));
    expect(res.status).toBe(200);
    expect((res.body as { result: { points: unknown[] } }).result.points).toHaveLength(21);
  });
});
