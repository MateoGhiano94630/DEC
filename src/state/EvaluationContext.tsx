/**
 * Estado compartido entre páginas: metadatos (criterios y perfiles), modelos
 * cargados, pesos actuales y modelos seleccionados para evaluar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Alternative } from '../domain/types';
import { api, type Meta } from '../lib/api';

export const CUSTOM_PROFILE = 'personalizado';

interface EvaluationState {
  meta: Meta | null;
  alternatives: Alternative[];
  loadError: string | null;
  /** Pesos en fracciones (0–1). Pueden no sumar 1 mientras el usuario edita. */
  weights: number[];
  profileId: string;
  selectedIds: number[];
  setWeights: (w: number[]) => void;
  applyProfile: (id: string) => void;
  setSelectedIds: (ids: number[]) => void;
  reloadAlternatives: () => Promise<void>;
}

const Ctx = createContext<EvaluationState | null>(null);

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weights, setWeightsState] = useState<number[]>([]);
  const [profileId, setProfileId] = useState('programacion');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const reloadAlternatives = useCallback(async () => {
    const list = await api.listAlternatives();
    setAlternatives(list);
    // Conserva la selección existente; los modelos nuevos quedan seleccionados.
    setSelectedIds((prev) => {
      const known = new Set(prev);
      const ids = list.map((a) => a.id);
      return prev.length === 0 ? ids : ids.filter((id) => known.has(id) || !alternatives.some((a) => a.id === id));
    });
  }, [alternatives]);

  useEffect(() => {
    Promise.all([api.meta(), api.listAlternatives()])
      .then(([m, list]) => {
        setMeta(m);
        setAlternatives(list);
        setSelectedIds(list.map((a) => a.id));
        const initial = m.profiles.find((p) => p.id === 'programacion') ?? m.profiles[0];
        setProfileId(initial.id);
        setWeightsState(initial.weights);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  const setWeights = useCallback((w: number[]) => {
    setWeightsState(w);
    setProfileId(CUSTOM_PROFILE);
  }, []);

  const applyProfile = useCallback(
    (id: string) => {
      const p = meta?.profiles.find((x) => x.id === id);
      if (!p) return;
      setWeightsState(p.weights);
      setProfileId(id);
    },
    [meta],
  );

  const value = useMemo(
    () => ({ meta, alternatives, loadError, weights, profileId, selectedIds, setWeights, applyProfile, setSelectedIds, reloadAlternatives }),
    [meta, alternatives, loadError, weights, profileId, selectedIds, setWeights, applyProfile, reloadAlternatives],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvaluation(): EvaluationState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEvaluation debe usarse dentro de EvaluationProvider');
  return ctx;
}

export const weightSum = (w: number[]) => w.reduce((a, b) => a + b, 0);
/** Misma tolerancia que el motor (1e-6). */
export const weightsValid = (w: number[]) => w.length > 0 && Math.abs(weightSum(w) - 1) <= 1e-6;
