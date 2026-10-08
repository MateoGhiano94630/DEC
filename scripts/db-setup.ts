/**
 * Crea la tabla en Postgres y carga los datos semilla.
 *   npm run db:setup   → crea la tabla si no existe y la carga si está vacía
 *   npm run db:reset   → borra todo y vuelve a cargar la semilla
 * Requiere DATABASE_URL (por ejemplo en .env.local, que se carga con --env-file).
 */
import { neonExecutor, PostgresRepository } from '../server/repository.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta la variable DATABASE_URL.');
  process.exit(1);
}
const repo = new PostgresRepository(neonExecutor(url));
const rows = process.argv.includes('--reset') ? await repo.reset() : await repo.list();
console.table(rows.map((r) => ({ id: r.id, name: r.name, provider: r.provider })));
