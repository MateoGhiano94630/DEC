/**
 * Acceso a datos de las alternativas. Con DATABASE_URL se usa Postgres (Neon);
 * sin ella, un repositorio en memoria inicializado con los datos semilla
 * (útil para desarrollo local y tests, no persiste entre reinicios).
 */
import { neon } from '@neondatabase/serverless';
import { SEED_ALTERNATIVES } from '../src/domain/seed.js';
import type { Alternative, AlternativeInput } from '../src/domain/types.js';

export interface AlternativeRepository {
  readonly kind: 'postgres' | 'memory';
  list(): Promise<Alternative[]>;
  get(id: number): Promise<Alternative | null>;
  create(data: AlternativeInput): Promise<Alternative>;
  update(id: number, data: AlternativeInput): Promise<Alternative | null>;
  remove(id: number): Promise<boolean>;
  /** Borra todo y vuelve a cargar los datos semilla (en una sola transacción). */
  reset(): Promise<Alternative[]>;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS alternatives (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  provider           TEXT NOT NULL,
  variant            TEXT NOT NULL DEFAULT '',
  open_weights       BOOLEAN NOT NULL DEFAULT FALSE,
  price_input        DOUBLE PRECISION NOT NULL CHECK (price_input >= 0),
  price_output       DOUBLE PRECISION NOT NULL CHECK (price_output >= 0),
  intelligence_index DOUBLE PRECISION NOT NULL CHECK (intelligence_index BETWEEN 0 AND 100),
  context_window     INTEGER NOT NULL CHECK (context_window > 0),
  output_speed       DOUBLE PRECISION NOT NULL CHECK (output_speed >= 0),
  multimodal_score   SMALLINT NOT NULL CHECK (multimodal_score BETWEEN 1 AND 5),
  privacy_score      SMALLINT NOT NULL CHECK (privacy_score BETWEEN 1 AND 5),
  notes              TEXT NOT NULL DEFAULT '',
  source_url         TEXT NOT NULL DEFAULT '',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, variant)
)`;

const COLUMNS = [
  'name',
  'provider',
  'variant',
  'open_weights',
  'price_input',
  'price_output',
  'intelligence_index',
  'context_window',
  'output_speed',
  'multimodal_score',
  'privacy_score',
  'notes',
  'source_url',
] as const;

type Row = Record<string, unknown>;

/** Mínimo que el repositorio necesita de un driver SQL (Neon en producción, PGlite en tests). */
export interface SqlExecutor {
  query(text: string, params?: unknown[]): Promise<Row[]>;
  /** Ejecuta las sentencias en una única transacción y devuelve las filas de cada una. */
  transaction(statements: { text: string; params?: unknown[] }[]): Promise<Row[][]>;
}

/** Driver HTTP de Neon: cada consulta es una petición HTTP, ideal para funciones serverless. */
export function neonExecutor(url: string): SqlExecutor {
  const sql = neon(url);
  return {
    query: async (text, params) => (await sql.query(text, params)) as Row[],
    transaction: async (statements) => (await sql.transaction(statements.map((s) => sql.query(s.text, s.params)))) as Row[][],
  };
}

function fromRow(r: Row): Alternative {
  return {
    id: Number(r.id),
    name: String(r.name),
    provider: String(r.provider),
    variant: String(r.variant),
    openWeights: Boolean(r.open_weights),
    priceInput: Number(r.price_input),
    priceOutput: Number(r.price_output),
    intelligenceIndex: Number(r.intelligence_index),
    contextWindow: Number(r.context_window),
    outputSpeed: Number(r.output_speed),
    multimodalScore: Number(r.multimodal_score),
    privacyScore: Number(r.privacy_score),
    notes: String(r.notes),
    sourceUrl: String(r.source_url),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function toParams(a: AlternativeInput): unknown[] {
  return [
    a.name,
    a.provider,
    a.variant,
    a.openWeights,
    a.priceInput,
    a.priceOutput,
    a.intelligenceIndex,
    a.contextWindow,
    a.outputSpeed,
    a.multimodalScore,
    a.privacyScore,
    a.notes,
    a.sourceUrl,
  ];
}

const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
const INSERT_SQL = `INSERT INTO alternatives (${COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING *`;
/** Carga inicial idempotente: si dos instancias arrancan a la vez, la segunda no duplica filas. */
const SEED_INSERT_SQL = `INSERT INTO alternatives (${COLUMNS.join(', ')}) VALUES (${placeholders}) ON CONFLICT (name, variant) DO NOTHING RETURNING *`;

export class PostgresRepository implements AlternativeRepository {
  readonly kind = 'postgres' as const;
  private ready: Promise<void> | null = null;

  constructor(private sql: SqlExecutor) {}

  /** Crea la tabla y la carga con los datos semilla la primera vez (una vez por instancia). */
  private ensureSchema(): Promise<void> {
    this.ready ??= (async () => {
      await this.sql.query(SCHEMA_SQL);
      const [{ count }] = await this.sql.query('SELECT COUNT(*)::int AS count FROM alternatives');
      if (Number(count) === 0) await this.seed(false);
    })().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }

  private async seed(truncate: boolean): Promise<Row[][]> {
    return this.sql.transaction([
      ...(truncate ? [{ text: 'TRUNCATE alternatives RESTART IDENTITY' }] : []),
      ...SEED_ALTERNATIVES.map((a) => ({ text: truncate ? INSERT_SQL : SEED_INSERT_SQL, params: toParams(a) })),
    ]);
  }

  async list() {
    await this.ensureSchema();
    const rows = await this.sql.query('SELECT * FROM alternatives ORDER BY id');
    return rows.map(fromRow);
  }

  async get(id: number) {
    await this.ensureSchema();
    const rows = await this.sql.query('SELECT * FROM alternatives WHERE id = $1', [id]);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async create(data: AlternativeInput) {
    await this.ensureSchema();
    const rows = await this.sql.query(INSERT_SQL, toParams(data));
    return fromRow(rows[0]);
  }

  async update(id: number, data: AlternativeInput) {
    await this.ensureSchema();
    const sets = COLUMNS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const rows = await this.sql.query(`UPDATE alternatives SET ${sets}, updated_at = NOW() WHERE id = $${COLUMNS.length + 1} RETURNING *`, [
      ...toParams(data),
      id,
    ]);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async remove(id: number) {
    await this.ensureSchema();
    const rows = await this.sql.query('DELETE FROM alternatives WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }

  async reset() {
    await this.ensureSchema();
    const results = await this.seed(true);
    return results.slice(1).map((rows) => fromRow(rows[0])); // [0] es el TRUNCATE
  }
}

export class MemoryRepository implements AlternativeRepository {
  readonly kind = 'memory' as const;
  private items: Alternative[] = [];
  private nextId = 1;

  constructor() {
    this.loadSeed();
  }

  private loadSeed() {
    this.nextId = 1;
    this.items = SEED_ALTERNATIVES.map((a) => this.build(a));
  }

  private build(a: AlternativeInput, id = this.nextId++): Alternative {
    return { ...a, id, updatedAt: new Date().toISOString() };
  }

  private assertUnique(a: AlternativeInput, exceptId?: number) {
    if (this.items.some((x) => x.id !== exceptId && x.name === a.name && x.variant === a.variant)) {
      throw Object.assign(new Error('duplicate'), { code: '23505' });
    }
  }

  async list() {
    return this.items.map((x) => ({ ...x }));
  }
  async get(id: number) {
    const found = this.items.find((x) => x.id === id);
    return found ? { ...found } : null;
  }
  async create(data: AlternativeInput) {
    this.assertUnique(data);
    const item = this.build(data);
    this.items.push(item);
    return { ...item };
  }
  async update(id: number, data: AlternativeInput) {
    const idx = this.items.findIndex((x) => x.id === id);
    if (idx < 0) return null;
    this.assertUnique(data, id);
    this.items[idx] = this.build(data, id);
    return { ...this.items[idx] };
  }
  async remove(id: number) {
    const before = this.items.length;
    this.items = this.items.filter((x) => x.id !== id);
    return this.items.length < before;
  }
  async reset() {
    this.loadSeed();
    return this.list();
  }
}

let instance: AlternativeRepository | null = null;

export function getRepository(): AlternativeRepository {
  instance ??= process.env.DATABASE_URL ? new PostgresRepository(neonExecutor(process.env.DATABASE_URL)) : new MemoryRepository();
  return instance;
}

/** Sólo para tests. */
export function setRepository(repo: AlternativeRepository | null) {
  instance = repo;
}
