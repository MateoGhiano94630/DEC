/**
 * Perfiles de usuario predefinidos (sección 5 de la entrega 1).
 * Orden de los pesos: C1 Costo, C2 Calidad, C3 Contexto, C4 Velocidad, C5 Multimodal, C6 Privacidad.
 */
import type { Profile } from './types.js';

export const PROFILES: Profile[] = [
  {
    id: 'equilibrado',
    name: 'Equilibrado',
    description: 'Uso general sin una prioridad dominante.',
    weights: [0.2, 0.2, 0.15, 0.15, 0.15, 0.15],
  },
  {
    id: 'programacion',
    name: 'Programación',
    description: 'Prioriza la calidad de razonamiento y una ventana de contexto amplia para trabajar sobre repositorios completos.',
    weights: [0.1, 0.35, 0.25, 0.15, 0.05, 0.1],
  },
  {
    id: 'economico',
    name: 'Uso económico',
    description: 'Minimiza el costo por token manteniendo una calidad aceptable.',
    weights: [0.4, 0.2, 0.1, 0.15, 0.05, 0.1],
  },
  {
    id: 'datos-sensibles',
    name: 'Datos sensibles',
    description: 'Para organizaciones que envían información confidencial: la privacidad es lo primero.',
    weights: [0.1, 0.2, 0.15, 0.1, 0.05, 0.4],
  },
  {
    id: 'multimodal',
    name: 'Multimodal',
    description: 'Análisis de imágenes, documentos, audio o video.',
    weights: [0.15, 0.2, 0.1, 0.1, 0.35, 0.1],
  },
  {
    id: 'tiempo-real',
    name: 'Tiempo real',
    description: 'Chatbots y asistentes donde la latencia de respuesta es crítica.',
    weights: [0.2, 0.15, 0.05, 0.4, 0.1, 0.1],
  },
];
