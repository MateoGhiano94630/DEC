/** Un modelo de IA (alternativa) tal como se guarda en la base de datos. */
export interface Alternative {
  id: number;
  name: string;
  provider: string;
  /** Variante o nivel de esfuerzo evaluado, p. ej. "high". */
  variant: string;
  openWeights: boolean;
  /** USD por millón de tokens de entrada. */
  priceInput: number;
  /** USD por millón de tokens de salida. */
  priceOutput: number;
  /** C2: Artificial Analysis Intelligence Index. */
  intelligenceIndex: number;
  /** C3: ventana de contexto en tokens. */
  contextWindow: number;
  /** C4: tokens de salida por segundo. */
  outputSpeed: number;
  /** C5: Likert 1–5. */
  multimodalScore: number;
  /** C6: Likert 1–5. */
  privacyScore: number;
  /** Justificación de los puntajes cualitativos. */
  notes: string;
  sourceUrl: string;
  updatedAt: string;
}

export type AlternativeInput = Omit<Alternative, 'id' | 'updatedAt'>;

export interface Profile {
  id: string;
  name: string;
  description: string;
  /** Pesos C1..C6, suman 1. */
  weights: number[];
}
