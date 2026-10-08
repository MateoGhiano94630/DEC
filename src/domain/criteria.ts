/**
 * Definición de los criterios de evaluación (sección 4 de la entrega 1) y de
 * cómo se obtiene cada valor de la matriz de decisión a partir de los datos de
 * un modelo.
 */
import type { CriterionType } from '../engine/topsis.js';
import type { AlternativeInput } from './types.js';

export type CriterionCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export interface CriterionDef {
  code: CriterionCode;
  name: string;
  type: CriterionType;
  unit: string;
  description: string;
  /** Rúbrica Likert 1–5 para los criterios cualitativos. */
  rubric?: { score: number; label: string }[];
}

/** Proporción entrada:salida usada para el costo ponderado (estándar de Artificial Analysis). */
export const BLEND_INPUT_RATIO = 3;
export const BLEND_OUTPUT_RATIO = 1;

export const CRITERIA: CriterionDef[] = [
  {
    code: 'C1',
    name: 'Costo de utilización',
    type: 'cost',
    unit: 'USD / 1M tokens',
    description:
      'Costo ponderado por millón de tokens con proporción 3:1 entrada/salida: (3·precio_entrada + precio_salida) / 4. Precio de la API oficial del proveedor.',
  },
  {
    code: 'C2',
    name: 'Calidad de razonamiento',
    type: 'benefit',
    unit: 'puntos (0–100)',
    description:
      'Artificial Analysis Intelligence Index: índice compuesto que promedia benchmarks públicos de razonamiento, conocimiento, matemática, programación y uso agéntico.',
  },
  {
    code: 'C3',
    name: 'Ventana de contexto',
    type: 'benefit',
    unit: 'tokens',
    description: 'Cantidad máxima de tokens que el modelo procesa por sesión (entrada + salida).',
  },
  {
    code: 'C4',
    name: 'Velocidad de generación',
    type: 'benefit',
    unit: 'tokens / s',
    description: 'Mediana de tokens de salida por segundo medida por Artificial Analysis sobre la API del proveedor.',
  },
  {
    code: 'C5',
    name: 'Soporte multimodal',
    type: 'benefit',
    unit: 'Likert 1–5',
    description: 'Flexibilidad para admitir texto, imágenes, documentos, audio y video. Se puntúa según las modalidades de entrada/salida.',
    rubric: [
      { score: 1, label: 'Solo texto' },
      { score: 2, label: 'Texto + imagen / documentos' },
      { score: 3, label: 'Texto + imagen + (video o audio)' },
      { score: 4, label: 'Texto + imagen + video + audio' },
      { score: 5, label: 'Entrada multimodal completa y además genera imagen o audio' },
    ],
  },
  {
    code: 'C6',
    name: 'Privacidad',
    type: 'benefit',
    unit: 'Likert 1–5',
    description: 'Nivel de protección de los datos del usuario enviados al modelo, según la política de datos de la API y la posibilidad de autoalojarlo.',
    rubric: [
      { score: 1, label: 'Usa los datos de la API para entrenar por defecto' },
      { score: 2, label: 'No entrena, pero retención larga, términos poco claros o jurisdicción sin garantías' },
      { score: 3, label: 'No entrena con datos de la API y retención acotada (≤ 30 días)' },
      { score: 4, label: 'Lo anterior + opción de retención cero (ZDR) y certificaciones (SOC 2 / ISO 27001)' },
      { score: 5, label: 'Pesos abiertos: autoalojable, los datos nunca salen de la infraestructura propia' },
    ],
  },
];

export function blendedCost(priceInput: number, priceOutput: number): number {
  return (BLEND_INPUT_RATIO * priceInput + BLEND_OUTPUT_RATIO * priceOutput) / (BLEND_INPUT_RATIO + BLEND_OUTPUT_RATIO);
}

/** Fila de la matriz de decisión (C1..C6) para un modelo. */
export function criteriaValues(a: AlternativeInput): number[] {
  return [
    blendedCost(a.priceInput, a.priceOutput),
    a.intelligenceIndex,
    a.contextWindow,
    a.outputSpeed,
    a.multimodalScore,
    a.privacyScore,
  ];
}
