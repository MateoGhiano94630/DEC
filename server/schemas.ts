/** Esquemas de validación (zod) de los cuerpos de las peticiones. */
import { z } from 'zod';
import { CRITERIA } from '../src/domain/criteria.js';
import { WEIGHT_SUM_TOLERANCE } from '../src/engine/topsis.js';

const likert = z.number().int().min(1).max(5);

export const alternativeSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(80),
  provider: z.string().trim().min(1, 'El proveedor es obligatorio.').max(60),
  variant: z.string().trim().max(60).default(''),
  openWeights: z.boolean().default(false),
  priceInput: z.number().finite().min(0),
  priceOutput: z.number().finite().min(0),
  intelligenceIndex: z.number().finite().min(0).max(100),
  contextWindow: z.number().int().positive().max(2_000_000_000),
  outputSpeed: z.number().finite().min(0),
  multimodalScore: likert,
  privacyScore: likert,
  notes: z.string().max(2000).default(''),
  sourceUrl: z.union([z.literal(''), z.url()]).default(''),
});

export const weightsSchema = z
  .array(z.number().finite().min(0).max(1))
  .length(CRITERIA.length, `Se esperan ${CRITERIA.length} pesos.`)
  .refine((w) => Math.abs(w.reduce((a, b) => a + b, 0) - 1) <= WEIGHT_SUM_TOLERANCE, 'Los pesos deben sumar 1.');

export const evaluationSchema = z.object({
  weights: weightsSchema,
  /** Subconjunto de modelos a evaluar; si se omite se usan todos. */
  alternativeIds: z.array(z.number().int().positive()).min(2, 'Seleccioná al menos 2 modelos.').optional(),
});

export const sensitivitySchema = evaluationSchema.extend({
  criterionIndex: z.number().int().min(0).max(CRITERIA.length - 1),
  steps: z.number().int().min(2).max(200).default(50),
});
