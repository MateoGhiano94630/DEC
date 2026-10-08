/**
 * Ejecuta el repositorio de Postgres contra PGlite (Postgres real compilado a
 * WebAssembly) para validar el SQL: esquema, restricciones, ABM y transacciones.
 */
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { PostgresRepository, type SqlExecutor } from '../server/repository.js';
import { SEED_ALTERNATIVES } from '../src/domain/seed.js';

type Row = Record<string, unknown>;

function pgliteExecutor(db: PGlite): SqlExecutor {
  return {
    query: async (text, params) => (await db.query<Row>(text, params as unknown[])).rows,
    transaction: (statements) =>
      db.transaction(async (tx) => {
        const out: Row[][] = [];
        for (const s of statements) out.push((await tx.query<Row>(s.text, s.params as unknown[])).rows);
        return out;
      }),
  };
}

let db: PGlite;
let repo: PostgresRepository;
const sample = { ...SEED_ALTERNATIVES[0], name: 'Nuevo', variant: 'x' };

beforeEach(async () => {
  db = new PGlite();
  repo = new PostgresRepository(pgliteExecutor(db));
});

describe('PostgresRepository (PGlite)', () => {
  it('crea el esquema y carga la semilla en el primer acceso', async () => {
    const list = await repo.list();
    expect(list).toHaveLength(SEED_ALTERNATIVES.length);
    expect(list[0]).toMatchObject({ id: 1, name: 'Claude Opus 5.5', priceInput: 4, contextWindow: 1_000_000, openWeights: false });
  });

  it('la carga inicial es idempotente entre instancias', async () => {
    await repo.list();
    const other = new PostgresRepository(pgliteExecutor(db));
    await db.query('DELETE FROM alternatives WHERE id = 1');
    expect(await other.list()).toHaveLength(SEED_ALTERNATIVES.length - 1); // no vuelve a sembrar si hay filas
  });

  it('ABM completo', async () => {
    const created = await repo.create(sample);
    expect(created.id).toBe(SEED_ALTERNATIVES.length + 1);
    const updated = await repo.update(created.id, { ...sample, outputSpeed: 500.5 });
    expect(updated?.outputSpeed).toBe(500.5);
    expect(await repo.update(9999, sample)).toBeNull();
    expect(await repo.remove(created.id)).toBe(true);
    expect(await repo.get(created.id)).toBeNull();
  });

  it('la restricción UNIQUE devuelve el código 23505', async () => {
    await repo.list();
    await expect(repo.create({ ...SEED_ALTERNATIVES[0] })).rejects.toMatchObject({ code: '23505' });
  });

  it('los CHECK del esquema rechazan valores fuera de rango', async () => {
    await repo.list();
    await expect(repo.create({ ...sample, privacyScore: 9 })).rejects.toThrow();
    await expect(repo.create({ ...sample, priceInput: -1 })).rejects.toThrow();
  });

  it('reset reemplaza todo en una transacción y reinicia los ids', async () => {
    await repo.create(sample);
    const rows = await repo.reset();
    expect(rows.map((r) => r.id)).toEqual(SEED_ALTERNATIVES.map((_, i) => i + 1));
    expect(await repo.list()).toHaveLength(SEED_ALTERNATIVES.length);
  });
});
