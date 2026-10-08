/**
 * Análisis de sensibilidad de un peso.
 *
 * Se hace variar el peso del criterio k entre 0 y 1 y se reparte el resto
 * (1 − w_k) entre los demás criterios manteniendo sus proporciones originales:
 *
 *   w'_k = t
 *   w'_j = w_j · (1 − t) / (1 − w_k)      para j ≠ k
 *
 * Así Σ w' = 1 para todo t y la relación entre los otros criterios no cambia.
 * Si originalmente w_k = 1 (los demás valen 0) no hay proporciones que mantener
 * y el resto se reparte en partes iguales.
 */
import { topsis, type TopsisInput, TopsisValidationError } from './topsis.js';

export interface SensitivityPoint {
  /** Peso asignado al criterio analizado. */
  weight: number;
  /** C_i de cada alternativa (mismo orden que input.alternatives). */
  closeness: number[];
  /** Índice de la alternativa ganadora (la primera del ranking). */
  winner: number;
}

export interface SensitivityResult {
  criterionIndex: number;
  originalWeight: number;
  points: SensitivityPoint[];
  /** Pesos en los que cambia la alternativa ganadora (aproximados a la grilla). */
  winnerChanges: { weight: number; from: number; to: number }[];
}

export function redistributeWeights(weights: number[], k: number, t: number): number[] {
  const rest = 1 - weights[k];
  const others = weights.length - 1;
  return weights.map((w, j) => {
    if (j === k) return t;
    if (rest <= 1e-12) return others > 0 ? (1 - t) / others : 0;
    return (w * (1 - t)) / rest;
  });
}

export function sensitivity(input: TopsisInput, criterionIndex: number, steps = 50): SensitivityResult {
  if (!Number.isInteger(criterionIndex) || criterionIndex < 0 || criterionIndex >= input.criteria.length) {
    throw new TopsisValidationError('Índice de criterio fuera de rango.');
  }
  if (!Number.isInteger(steps) || steps < 2 || steps > 200) {
    throw new TopsisValidationError('La cantidad de pasos debe estar entre 2 y 200.');
  }
  const points: SensitivityPoint[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const result = topsis({ ...input, weights: redistributeWeights(input.weights, criterionIndex, t) });
    points.push({ weight: t, closeness: result.closeness, winner: result.ranking[0].index });
  }
  const winnerChanges = points
    .slice(1)
    .map((p, idx) => ({ weight: p.weight, from: points[idx].winner, to: p.winner }))
    .filter((c) => c.from !== c.to);
  return { criterionIndex, originalWeight: input.weights[criterionIndex], points, winnerChanges };
}
