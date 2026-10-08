/**
 * Matriz de decisión inicial. Datos relevados el 25/09/2026.
 *
 * Fuente de C1–C5: Artificial Analysis (https://artificialanalysis.ai), página
 * de cada modelo (precios de la API oficial, Intelligence Index, velocidad
 * mediana, ventana de contexto y modalidades de entrada/salida).
 * C6 surge de las políticas de datos de cada proveedor (ver docs/DATOS.md).
 */
import type { AlternativeInput } from './types.js';

const AA = 'https://artificialanalysis.ai/models/';

export const SEED_ALTERNATIVES: AlternativeInput[] = [
  {
    name: 'Claude Opus 5.5',
    provider: 'Anthropic',
    variant: 'Adaptive reasoning, high',
    openWeights: false,
    priceInput: 4,
    priceOutput: 20,
    intelligenceIndex: 53.58,
    contextWindow: 1_000_000,
    outputSpeed: 87.4,
    multimodalScore: 2,
    privacyScore: 4,
    notes:
      'C5: entrada texto + imagen (y PDF). C6: no entrena con datos de la API, retención de 30 días, ZDR disponible para cuentas calificadas, SOC 2 Tipo II / ISO 27001.',
    sourceUrl: `${AA}claude-opus-5-5-high`,
  },
  {
    name: 'GPT-6 Astra',
    provider: 'OpenAI',
    variant: 'high',
    openWeights: false,
    priceInput: 10,
    priceOutput: 50,
    intelligenceIndex: 50.92,
    contextWindow: 1_000_000,
    outputSpeed: 56.0,
    multimodalScore: 2,
    privacyScore: 4,
    notes:
      'C5: entrada texto + imagen. C6: no entrena con datos de la API por defecto, retención de 30 días para monitoreo de abuso, ZDR disponible, SOC 2 Tipo II.',
    sourceUrl: `${AA}gpt-6-astra-high`,
  },
  {
    name: 'Gemini 3.8 Flash',
    provider: 'Google',
    variant: 'high',
    openWeights: false,
    priceInput: 0.75,
    priceOutput: 3.75,
    intelligenceIndex: 40.93,
    contextWindow: 1_000_000,
    outputSpeed: 338.2,
    multimodalScore: 4,
    privacyScore: 4,
    notes:
      'C5: entrada texto + imagen + audio + video. C6: el tier pago no entrena con los datos, retención configurable (7–55 días), ZDR en Gemini API / Vertex AI, certificaciones de Google Cloud.',
    sourceUrl: `${AA}gemini-3-8-flash`,
  },
  {
    name: 'Grok 4.7',
    provider: 'xAI',
    variant: 'high',
    openWeights: false,
    priceInput: 2,
    priceOutput: 6,
    intelligenceIndex: 46.33,
    contextWindow: 500_000,
    outputSpeed: 58.3,
    multimodalScore: 2,
    privacyScore: 4,
    notes:
      'C5: entrada texto + imagen. C6: no entrena con datos de la API sin permiso explícito, retención de 30 días, ZDR para cuentas enterprise, SOC 2.',
    sourceUrl: `${AA}grok-4-7-high`,
  },
  {
    name: 'Muse Spark 1.3',
    provider: 'Meta',
    variant: 'max',
    openWeights: false,
    priceInput: 1.25,
    priceOutput: 4.25,
    intelligenceIndex: 48.09,
    contextWindow: 1_000_000,
    outputSpeed: 226.8,
    multimodalScore: 3,
    privacyScore: 2,
    notes:
      'Sucesor de Llama en la línea de Meta. C5: entrada texto + imagen + video. C6: términos poco claros sobre uso para entrenamiento y retención; ZDR solo a pedido vía ventas.',
    sourceUrl: `${AA}muse-spark-1-3`,
  },
  {
    name: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    variant: 'Reasoning, max effort',
    openWeights: true,
    priceInput: 0.3,
    priceOutput: 1.2,
    intelligenceIndex: 39.46,
    contextWindow: 1_000_000,
    outputSpeed: 236.1,
    multimodalScore: 2,
    privacyScore: 5,
    notes:
      'C5: entrada texto + imagen. C6: pesos abiertos, autoalojable (la API oficial se aloja en China; si se usa esa API la privacidad sería menor).',
    sourceUrl: `${AA}deepseek-v4-1-flash`,
  },
  {
    name: 'Mistral Medium 3.5',
    provider: 'Mistral',
    variant: '—',
    openWeights: true,
    priceInput: 1.5,
    priceOutput: 7.5,
    intelligenceIndex: 14.19,
    contextWindow: 256_000,
    outputSpeed: 144.1,
    multimodalScore: 2,
    privacyScore: 5,
    notes: 'C5: entrada texto + imagen. C6: pesos abiertos, autoalojable; la API paga de Mistral (UE) no entrena con los datos.',
    sourceUrl: `${AA}mistral-medium-3-5`,
  },
  {
    name: 'Qwen3.8 Max',
    provider: 'Alibaba',
    variant: '0902',
    openWeights: false,
    priceInput: 2,
    priceOutput: 6,
    intelligenceIndex: 45.42,
    contextWindow: 983_616,
    outputSpeed: 39.7,
    multimodalScore: 2,
    privacyScore: 3,
    notes:
      'C5: entrada texto + imagen. C6: Alibaba Cloud Model Studio declara no usar los datos para entrenar y ofrece regiones fuera de China; sin ZDR documentado.',
    sourceUrl: `${AA}qwen3-8-max`,
  },
];
