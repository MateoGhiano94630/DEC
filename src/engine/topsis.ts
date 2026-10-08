/**
 * Motor TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution).
 *
 * Implementación del método clásico de Hwang & Yoon (1981) con normalización
 * vectorial. Es un módulo puro: no depende de la base de datos, de la red ni de
 * React, de modo que el mismo código se ejecuta en el backend (funciones
 * serverless) y en los tests.
 *
 * Notación (m alternativas, n criterios):
 *   x_ij  valor de la alternativa i en el criterio j (matriz de decisión)
 *   w_j   peso del criterio j, con Σ w_j = 1
 *   r_ij  = x_ij / sqrt(Σ_i x_ij²)                       (1) normalización vectorial
 *   v_ij  = w_j · r_ij                                    (2) matriz ponderada
 *   A+_j  = max_i v_ij (beneficio) | min_i v_ij (costo)   (3) solución ideal positiva (SIP)
 *   A-_j  = min_i v_ij (beneficio) | max_i v_ij (costo)   (3) solución ideal negativa (SIN)
 *   D+_i  = sqrt(Σ_j (v_ij − A+_j)²)                      (4) distancia euclidiana a la SIP
 *   D-_i  = sqrt(Σ_j (v_ij − A-_j)²)                      (4) distancia euclidiana a la SIN
 *   C_i   = D-_i / (D+_i + D-_i)                          (5) coeficiente de proximidad relativa
 *
 * El ranking ordena las alternativas por C_i en forma decreciente (C_i ∈ [0, 1]).
 */

export type CriterionType = 'benefit' | 'cost';

export interface TopsisCriterion {
  /** Identificador corto, p. ej. "C1". */
  code: string;
  /** 'benefit' = maximizar, 'cost' = minimizar. */
  type: CriterionType;
}

export interface TopsisInput {
  /** Nombres de las alternativas, en el mismo orden que las filas de `matrix`. */
  alternatives: string[];
  criteria: TopsisCriterion[];
  /** Matriz de decisión m × n (filas = alternativas, columnas = criterios). */
  matrix: number[][];
  /** Vector de pesos de longitud n. Debe sumar 1. */
  weights: number[];
}

export interface RankingEntry {
  /** Índice de la alternativa en la matriz original. */
  index: number;
  alternative: string;
  closeness: number;
  /** Posición en el ranking (1 = mejor). Las alternativas empatadas comparten posición. */
  rank: number;
}

export interface TopsisResult {
  alternatives: string[];
  criteria: TopsisCriterion[];
  weights: number[];
  /** Paso 0: matriz de decisión original. */
  matrix: number[][];
  /** Paso 1: norma euclidiana de cada columna, sqrt(Σ_i x_ij²). */
  columnNorms: number[];
  /** Paso 1: matriz normalizada R = [r_ij]. */
  normalized: number[][];
  /** Paso 2: matriz normalizada ponderada V = [v_ij]. */
  weighted: number[][];
  /** Paso 3: solución ideal positiva A+ (SIP). */
  idealPositive: number[];
  /** Paso 3: solución ideal negativa A- (SIN). */
  idealNegative: number[];
  /** Paso 4: distancia de cada alternativa a la SIP. */
  distancePositive: number[];
  /** Paso 4: distancia de cada alternativa a la SIN. */
  distanceNegative: number[];
  /** Paso 5: coeficiente de proximidad relativa C_i. */
  closeness: number[];
  /** Ranking final, ordenado de mejor a peor. */
  ranking: RankingEntry[];
  /** Situaciones degeneradas que no impiden el cálculo pero conviene informar. */
  warnings: string[];
}

/** Tolerancia para verificar que los pesos suman 1. */
export const WEIGHT_SUM_TOLERANCE = 1e-6;
/** Tolerancia para considerar empatados dos coeficientes de proximidad. */
export const TIE_TOLERANCE = 1e-12;

export class TopsisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopsisValidationError';
  }
}

/** Verifica las precondiciones matemáticas del método. Lanza TopsisValidationError si no se cumplen. */
export function validateTopsisInput(input: TopsisInput): void {
  const { alternatives, criteria, matrix, weights } = input;
  const m = alternatives.length;
  const n = criteria.length;

  if (m < 2) throw new TopsisValidationError('Se necesitan al menos 2 alternativas para construir un ranking.');
  if (n < 1) throw new TopsisValidationError('Se necesita al menos 1 criterio.');
  if (matrix.length !== m) {
    throw new TopsisValidationError(`La matriz tiene ${matrix.length} filas pero hay ${m} alternativas.`);
  }
  matrix.forEach((row, i) => {
    if (row.length !== n) {
      throw new TopsisValidationError(`La fila de "${alternatives[i]}" tiene ${row.length} valores pero hay ${n} criterios.`);
    }
    row.forEach((x, j) => {
      if (!Number.isFinite(x)) {
        throw new TopsisValidationError(`Valor no numérico en "${alternatives[i]}" / ${criteria[j].code}.`);
      }
      // La normalización vectorial supone valores no negativos: con signos mezclados
      // r_ij deja de representar la participación relativa de la alternativa.
      if (x < 0) {
        throw new TopsisValidationError(`Valor negativo en "${alternatives[i]}" / ${criteria[j].code}: TOPSIS requiere x_ij ≥ 0.`);
      }
    });
  });
  criteria.forEach((c) => {
    if (c.type !== 'benefit' && c.type !== 'cost') {
      throw new TopsisValidationError(`Tipo de criterio inválido en ${c.code}: "${c.type}".`);
    }
  });
  if (weights.length !== n) {
    throw new TopsisValidationError(`Hay ${weights.length} pesos pero ${n} criterios.`);
  }
  weights.forEach((w, j) => {
    if (!Number.isFinite(w) || w < 0) {
      throw new TopsisValidationError(`El peso de ${criteria[j].code} debe ser un número ≥ 0.`);
    }
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new TopsisValidationError(`Los pesos deben sumar 1 (suman ${sum.toFixed(6)}).`);
  }
}

/** Ejecuta TOPSIS completo y devuelve todos los pasos intermedios. */
export function topsis(input: TopsisInput): TopsisResult {
  validateTopsisInput(input);

  const { alternatives, criteria, matrix, weights } = input;
  const m = alternatives.length;
  const n = criteria.length;
  const warnings: string[] = [];
  const cols = range(n);
  const rows = range(m);

  // Paso 1: normalización vectorial r_ij = x_ij / sqrt(Σ_i x_ij²)
  const columnNorms = cols.map((j) => Math.sqrt(rows.reduce((acc, i) => acc + matrix[i][j] ** 2, 0)));
  cols.forEach((j) => {
    if (columnNorms[j] === 0) {
      // Columna toda en cero: el criterio no discrimina entre alternativas. Se toma r_ij = 0
      // (en vez de 0/0) y el criterio queda sin efecto sobre las distancias.
      warnings.push(`El criterio ${criteria[j].code} vale 0 en todas las alternativas; no aporta al ranking.`);
    }
  });
  const normalized = rows.map((i) => cols.map((j) => (columnNorms[j] === 0 ? 0 : matrix[i][j] / columnNorms[j])));

  // Paso 2: ponderación v_ij = w_j · r_ij
  const weighted = rows.map((i) => cols.map((j) => weights[j] * normalized[i][j]));

  // Paso 3: soluciones ideales. Para criterios de costo se invierte el sentido.
  const column = (j: number) => rows.map((i) => weighted[i][j]);
  const idealPositive = cols.map((j) => (criteria[j].type === 'benefit' ? Math.max(...column(j)) : Math.min(...column(j))));
  const idealNegative = cols.map((j) => (criteria[j].type === 'benefit' ? Math.min(...column(j)) : Math.max(...column(j))));

  // Paso 4: distancias euclidianas a la SIP y a la SIN
  const distance = (i: number, ideal: number[]) => Math.sqrt(cols.reduce((acc, j) => acc + (weighted[i][j] - ideal[j]) ** 2, 0));
  const distancePositive = rows.map((i) => distance(i, idealPositive));
  const distanceNegative = rows.map((i) => distance(i, idealNegative));

  // Paso 5: coeficiente de proximidad relativa C_i = D-_i / (D+_i + D-_i)
  let degenerate = false;
  const closeness = rows.map((i) => {
    const denom = distancePositive[i] + distanceNegative[i];
    if (denom === 0) {
      // D+ = D- = 0 sólo ocurre si SIP = SIN, es decir, si todas las alternativas son idénticas
      // en todos los criterios con peso > 0. El cociente es 0/0; todas quedan empatadas en 0.5.
      degenerate = true;
      return 0.5;
    }
    return distanceNegative[i] / denom;
  });
  if (degenerate) {
    warnings.push('Todas las alternativas son idénticas en los criterios ponderados; quedan empatadas (C = 0,5).');
  }

  const ranking = buildRanking(alternatives, closeness);

  return {
    alternatives: [...alternatives],
    criteria: criteria.map((c) => ({ ...c })),
    weights: [...weights],
    matrix: matrix.map((row) => [...row]),
    columnNorms,
    normalized,
    weighted,
    idealPositive,
    idealNegative,
    distancePositive,
    distanceNegative,
    closeness,
    ranking,
    warnings,
  };
}

/**
 * Ordena por C_i decreciente con ranking de competencia ("1, 2, 2, 4"):
 * las alternativas empatadas comparten posición y la siguiente salta.
 * A igual C_i se conserva el orden original (orden estable).
 */
export function buildRanking(alternatives: string[], closeness: number[]): RankingEntry[] {
  const sorted = closeness
    .map((c, index) => ({ index, alternative: alternatives[index], closeness: c, rank: 0 }))
    .sort((a, b) => (Math.abs(b.closeness - a.closeness) <= TIE_TOLERANCE ? a.index - b.index : b.closeness - a.closeness));
  sorted.forEach((entry, pos) => {
    const prev = sorted[pos - 1];
    entry.rank = prev && Math.abs(prev.closeness - entry.closeness) <= TIE_TOLERANCE ? prev.rank : pos + 1;
  });
  return sorted;
}

function range(k: number): number[] {
  return Array.from({ length: k }, (_, i) => i);
}
