import { describe, expect, it } from 'vitest';
import reference from './fixtures/reference.json' with { type: 'json' };
import { buildRanking, topsis, TopsisValidationError, type TopsisInput } from '../src/engine/topsis.js';
import { redistributeWeights, sensitivity } from '../src/engine/sensitivity.js';
import { SEED_ALTERNATIVES } from '../src/domain/seed.js';
import { CRITERIA, criteriaValues, blendedCost } from '../src/domain/criteria.js';
import { PROFILES } from '../src/domain/profiles.js';

const PRECISION = 12; // dígitos decimales para toBeCloseTo

function expectMatrixClose(actual: number[][], expected: number[][]) {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, i) => expectVectorClose(row, expected[i]));
}
function expectVectorClose(actual: number[], expected: number[]) {
  expect(actual.length).toBe(expected.length);
  actual.forEach((v, j) => expect(v).toBeCloseTo(expected[j], PRECISION));
}

function makeInput(matrix: number[][], weights: number[], types: ('benefit' | 'cost')[]): TopsisInput {
  return {
    alternatives: matrix.map((_, i) => `A${i + 1}`),
    criteria: types.map((type, j) => ({ code: `C${j + 1}`, type })),
    matrix,
    weights,
  };
}

describe('TOPSIS — ejemplo resuelto a mano', () => {
  // Un solo criterio de beneficio con valores 1, 2, 3 y peso 1.
  // ‖x‖ = √14, V = x/√14, A+ = 3/√14, A- = 1/√14.
  // D+ = (2, 1, 0)/√14, D- = (0, 1, 2)/√14  ⇒  C = (0, 0.5, 1).
  const r = topsis(makeInput([[1], [2], [3]], [1], ['benefit']));

  it('normaliza por la norma euclidiana de la columna', () => {
    expect(r.columnNorms[0]).toBeCloseTo(Math.sqrt(14), PRECISION);
    expectMatrixClose(r.normalized, [[1 / Math.sqrt(14)], [2 / Math.sqrt(14)], [3 / Math.sqrt(14)]]);
  });
  it('determina SIP y SIN', () => {
    expect(r.idealPositive[0]).toBeCloseTo(3 / Math.sqrt(14), PRECISION);
    expect(r.idealNegative[0]).toBeCloseTo(1 / Math.sqrt(14), PRECISION);
  });
  it('calcula distancias y proximidad relativa', () => {
    expectVectorClose(r.distancePositive, [2 / Math.sqrt(14), 1 / Math.sqrt(14), 0]);
    expectVectorClose(r.distanceNegative, [0, 1 / Math.sqrt(14), 2 / Math.sqrt(14)]);
    expectVectorClose(r.closeness, [0, 0.5, 1]);
    expect(r.ranking.map((e) => e.alternative)).toEqual(['A3', 'A2', 'A1']);
  });

  it('con el mismo criterio como costo el ranking se invierte', () => {
    const c = topsis(makeInput([[1], [2], [3]], [1], ['cost']));
    expectVectorClose(c.closeness, [1, 0.5, 0]);
    expect(c.idealPositive[0]).toBeCloseTo(1 / Math.sqrt(14), PRECISION);
  });

  it('ejemplo de dos criterios (beneficio y costo)', () => {
    // X = [[3, 4], [4, 3]], w = (0.6, 0.4), C1 beneficio, C2 costo. Ambas normas = 5.
    // V = [[0.36, 0.32], [0.48, 0.24]]  ⇒  A+ = (0.48, 0.24), A- = (0.36, 0.32)
    // A2 coincide con la SIP (C = 1) y A1 con la SIN (C = 0).
    const t = topsis(makeInput([[3, 4], [4, 3]], [0.6, 0.4], ['benefit', 'cost']));
    expectMatrixClose(t.weighted, [[0.36, 0.32], [0.48, 0.24]]);
    expectVectorClose(t.idealPositive, [0.48, 0.24]);
    expectVectorClose(t.idealNegative, [0.36, 0.32]);
    expectVectorClose(t.distancePositive, [0.144222051018559, 0]);
    expectVectorClose(t.closeness, [0, 1]);
  });
});

describe('TOPSIS — comparación con la implementación de referencia en numpy', () => {
  for (const c of reference) {
    it(c.name, () => {
      const r = topsis(makeInput(c.matrix, c.weights, c.benefit.map((b: boolean) => (b ? 'benefit' : 'cost'))));
      // Las normas pueden ser del orden de 1e6: se comparan en forma relativa.
      r.columnNorms.forEach((x, j) => expect(x / c.expected.columnNorms[j]).toBeCloseTo(1, PRECISION));
      expectMatrixClose(r.normalized, c.expected.normalized);
      expectMatrixClose(r.weighted, c.expected.weighted);
      expectVectorClose(r.idealPositive, c.expected.idealPositive);
      expectVectorClose(r.idealNegative, c.expected.idealNegative);
      expectVectorClose(r.distancePositive, c.expected.distancePositive);
      expectVectorClose(r.distanceNegative, c.expected.distanceNegative);
      expectVectorClose(r.closeness, c.expected.closeness);
    });
  }
});

describe('TOPSIS — propiedades matemáticas', () => {
  const seedMatrix = SEED_ALTERNATIVES.map(criteriaValues);
  const types = CRITERIA.map((c) => c.type);
  const base = makeInput(seedMatrix, PROFILES[0].weights, types);

  it('C_i ∈ [0, 1] para todos los perfiles', () => {
    for (const p of PROFILES) {
      const r = topsis({ ...base, weights: p.weights });
      r.closeness.forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      });
    }
  });

  it('es invariante al cambio de escala de un criterio (p. ej. tokens → miles de tokens)', () => {
    const scaled = seedMatrix.map((row) => row.map((x, j) => (j === 2 ? x / 1000 : x)));
    const a = topsis(base);
    const b = topsis({ ...base, matrix: scaled });
    expectVectorClose(b.closeness, a.closeness);
  });

  it('es invariante a la permutación de filas', () => {
    const perm = [3, 0, 7, 5, 1, 6, 2, 4];
    const a = topsis(base);
    const b = topsis({ ...base, alternatives: perm.map((i) => base.alternatives[i]), matrix: perm.map((i) => seedMatrix[i]) });
    perm.forEach((orig, k) => expect(b.closeness[k]).toBeCloseTo(a.closeness[orig], PRECISION));
  });

  it('un criterio con peso 0 no altera el resultado', () => {
    const withZero = makeInput(seedMatrix.map((r) => [...r, Math.random() * 100]), [...PROFILES[1].weights, 0], [...types, 'benefit']);
    const a = topsis({ ...base, weights: PROFILES[1].weights });
    const b = topsis(withZero);
    expectVectorClose(b.closeness, a.closeness);
  });

  it('una alternativa que domina en todos los criterios obtiene C = 1', () => {
    const dominant = types.map((t, j) => {
      const col = seedMatrix.map((r) => r[j]);
      return t === 'benefit' ? Math.max(...col) : Math.min(...col);
    });
    const r = topsis({ ...base, alternatives: [...base.alternatives, 'Dominante'], matrix: [...seedMatrix, dominant] });
    expect(r.ranking[0].alternative).toBe('Dominante');
    expect(r.ranking[0].closeness).toBeCloseTo(1, PRECISION);
  });

  it('coincide con el costo ponderado 3:1', () => {
    expect(blendedCost(4, 20)).toBe(8);
    expect(blendedCost(0.3, 1.2)).toBeCloseTo(0.525, PRECISION);
  });
});

describe('TOPSIS — empates y casos degenerados', () => {
  it('alternativas simétricas empatan y comparten posición', () => {
    const r = topsis(makeInput([[1, 2], [2, 1], [0.5, 0.5]], [0.5, 0.5], ['benefit', 'benefit']));
    expect(r.closeness[0]).toBeCloseTo(r.closeness[1], PRECISION);
    expect(r.ranking.map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it('ranking de competencia 1, 2, 2, 4', () => {
    expect(buildRanking(['a', 'b', 'c', 'd'], [0.9, 0.5, 0.5, 0.1]).map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it('columna de ceros: no divide por cero y emite advertencia', () => {
    const r = topsis(makeInput([[0, 1], [0, 2]], [0.5, 0.5], ['benefit', 'benefit']));
    expect(r.normalized.flat().every(Number.isFinite)).toBe(true);
    expect(r.warnings.length).toBe(1);
    expectVectorClose(r.closeness, [0, 1]);
  });

  it('alternativas idénticas: C = 0,5 para todas', () => {
    const r = topsis(makeInput([[1, 1], [1, 1]], [0.5, 0.5], ['benefit', 'cost']));
    expectVectorClose(r.closeness, [0.5, 0.5]);
    expect(r.ranking.map((e) => e.rank)).toEqual([1, 1]);
    expect(r.warnings.length).toBe(1);
  });
});

describe('TOPSIS — validación de entrada', () => {
  const ok = makeInput([[1, 2], [3, 4]], [0.5, 0.5], ['benefit', 'cost']);
  const cases: [string, Partial<TopsisInput>][] = [
    ['pesos que no suman 1', { weights: [0.5, 0.6] }],
    ['peso negativo', { weights: [1.5, -0.5] }],
    ['cantidad de pesos incorrecta', { weights: [1] }],
    ['una sola alternativa', { alternatives: ['A1'], matrix: [[1, 2]] }],
    ['valor negativo', { matrix: [[1, -2], [3, 4]] }],
    ['valor NaN', { matrix: [[1, NaN], [3, 4]] }],
    ['fila incompleta', { matrix: [[1], [3, 4]] }],
  ];
  for (const [label, patch] of cases) {
    it(`rechaza ${label}`, () => expect(() => topsis({ ...ok, ...patch })).toThrow(TopsisValidationError));
  }
  it('acepta pesos con error de redondeo menor a 1e-6', () => {
    expect(() => topsis({ ...ok, weights: [0.3333333, 0.6666666] })).not.toThrow();
  });
});

describe('Análisis de sensibilidad', () => {
  it('la redistribución mantiene la suma en 1 y las proporciones', () => {
    const w = redistributeWeights([0.1, 0.35, 0.25, 0.15, 0.05, 0.1], 1, 0.6);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, PRECISION);
    expect(w[1]).toBe(0.6);
    expect(w[2] / w[0]).toBeCloseTo(2.5, PRECISION);
  });

  it('en el peso original reproduce el resultado de TOPSIS', () => {
    const input = makeInput(SEED_ALTERNATIVES.map(criteriaValues), [0.2, 0.2, 0.2, 0.2, 0.1, 0.1], CRITERIA.map((c) => c.type));
    const s = sensitivity(input, 0, 10); // w_C1 original = 0.2 = paso 2
    expectVectorClose(s.points[2].closeness, topsis(input).closeness);
    expect(s.points).toHaveLength(11);
  });
});
