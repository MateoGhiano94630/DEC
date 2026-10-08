/**
 * Imprime en Markdown el desarrollo completo de TOPSIS para la matriz semilla y
 * un perfil (por defecto "programacion"). Se usa para generar el ejemplo de
 * docs/METODO_TOPSIS.md:   npx tsx scripts/example-markdown.ts [perfil]
 */
import { CRITERIA, criteriaValues } from '../src/domain/criteria.js';
import { PROFILES } from '../src/domain/profiles.js';
import { SEED_ALTERNATIVES } from '../src/domain/seed.js';
import { topsis } from '../src/engine/topsis.js';

const profile = PROFILES.find((p) => p.id === (process.argv[2] ?? 'programacion'))!;
const r = topsis({
  alternatives: SEED_ALTERNATIVES.map((a) => a.name),
  criteria: CRITERIA.map((c) => ({ code: c.code, type: c.type })),
  matrix: SEED_ALTERNATIVES.map(criteriaValues),
  weights: profile.weights,
});
const f = (x: number, d = 4) => x.toFixed(d);
const codes = CRITERIA.map((c) => c.code);
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((_, i) => (i === 0 ? ' --- ' : ' ---: ')).join('|')}|`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');

console.log(`**Perfil:** ${profile.name} — w = (${profile.weights.join(', ')})\n`);
console.log('**Paso 0 — Matriz de decisión X**\n');
console.log(table(['Modelo', ...codes], r.matrix.map((row, i) => [r.alternatives[i], ...row.map((x) => String(Number(x.toPrecision(12))))])));
console.log(`\n**Paso 1 — Normas de columna** √Σx²: ${r.columnNorms.map((x, j) => `${codes[j]} = ${f(x)}`).join(', ')}\n`);
console.log(table(['r_ij', ...codes], r.normalized.map((row, i) => [r.alternatives[i], ...row.map((x) => f(x))])));
console.log('\n**Paso 2 — Matriz ponderada V**\n');
console.log(table(['v_ij', ...codes], r.weighted.map((row, i) => [r.alternatives[i], ...row.map((x) => f(x))])));
console.log('\n**Paso 3 — Soluciones ideales**\n');
console.log(table(['', ...codes], [['A⁺ (SIP)', ...r.idealPositive.map((x) => f(x))], ['A⁻ (SIN)', ...r.idealNegative.map((x) => f(x))]]));
console.log('\n**Pasos 4 y 5 — Distancias, proximidad relativa y ranking**\n');
console.log(table(['Puesto', 'Modelo', 'D⁺', 'D⁻', 'C_i'], r.ranking.map((e) => [e.rank, e.alternative, f(r.distancePositive[e.index]), f(r.distanceNegative[e.index]), f(e.closeness)])));
