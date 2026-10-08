/** Handlers de la API. Cada archivo de /api expone uno de estos con toVercel(). */
import { CRITERIA, criteriaValues } from '../src/domain/criteria.js';
import { PROFILES } from '../src/domain/profiles.js';
import type { Alternative } from '../src/domain/types.js';
import { sensitivity } from '../src/engine/sensitivity.js';
import { topsis, type TopsisInput } from '../src/engine/topsis.js';
import { HttpError, ok, requireAdmin, route, type ApiRequest } from './http.js';
import { getRepository } from './repository.js';
import { alternativeSchema, evaluationSchema, sensitivitySchema } from './schemas.js';

function parseId(req: ApiRequest): number {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador inválido.');
  return id;
}

/** Traduce la violación de UNIQUE (name, variant) de Postgres a un 409. */
async function withConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'Ya existe un modelo con ese nombre y variante.');
    }
    throw err;
  }
}

/** Arma la entrada de TOPSIS a partir de los modelos guardados y el subconjunto elegido. */
async function buildInput(weights: number[], alternativeIds?: number[]): Promise<{ input: TopsisInput; used: Alternative[] }> {
  const all = await getRepository().list();
  let used = all;
  if (alternativeIds) {
    const wanted = new Set(alternativeIds);
    used = all.filter((a) => wanted.has(a.id));
    const missing = alternativeIds.filter((id) => !all.some((a) => a.id === id));
    if (missing.length) throw new HttpError(404, `No existen los modelos con id ${missing.join(', ')}.`);
  }
  if (used.length < 2) throw new HttpError(422, 'Se necesitan al menos 2 modelos para evaluar.');
  return {
    used,
    input: {
      alternatives: used.map((a) => a.name),
      criteria: CRITERIA.map((c) => ({ code: c.code, type: c.type })),
      matrix: used.map(criteriaValues),
      weights,
    },
  };
}

export const metaHandler = route({
  GET: async () => ok({ criteria: CRITERIA, profiles: PROFILES, storage: getRepository().kind }),
});

export const alternativesHandler = route({
  GET: async () => ok(await getRepository().list()),
  POST: async (req) => {
    requireAdmin(req);
    const data = alternativeSchema.parse(req.body);
    return ok(await withConflict(() => getRepository().create(data)), 201);
  },
});

export const alternativeByIdHandler = route({
  GET: async (req) => {
    const found = await getRepository().get(parseId(req));
    if (!found) throw new HttpError(404, 'Modelo no encontrado.');
    return ok(found);
  },
  PUT: async (req) => {
    requireAdmin(req);
    const id = parseId(req);
    const data = alternativeSchema.parse(req.body);
    const updated = await withConflict(() => getRepository().update(id, data));
    if (!updated) throw new HttpError(404, 'Modelo no encontrado.');
    return ok(updated);
  },
  DELETE: async (req) => {
    requireAdmin(req);
    const removed = await getRepository().remove(parseId(req));
    if (!removed) throw new HttpError(404, 'Modelo no encontrado.');
    return { status: 204 };
  },
});

export const resetHandler = route({
  POST: async (req) => {
    requireAdmin(req);
    return ok(await getRepository().reset());
  },
});

export const topsisHandler = route({
  POST: async (req) => {
    const { weights, alternativeIds } = evaluationSchema.parse(req.body);
    const { input, used } = await buildInput(weights, alternativeIds);
    return ok({ result: topsis(input), alternatives: used });
  },
});

export const sensitivityHandler = route({
  POST: async (req) => {
    const { weights, alternativeIds, criterionIndex, steps } = sensitivitySchema.parse(req.body);
    const { input, used } = await buildInput(weights, alternativeIds);
    return ok({ result: sensitivity(input, criterionIndex, steps), alternatives: used });
  },
});
