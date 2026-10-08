import { useEffect, useState } from 'react';
import { ModelPicker } from '../components/ModelPicker';
import { RankingChart } from '../components/RankingChart';
import { StepsView } from '../components/StepsView';
import { WeightsPanel } from '../components/WeightsPanel';
import type { Alternative } from '../domain/types';
import type { TopsisResult } from '../engine/topsis';
import { api } from '../lib/api';
import { fmt } from '../lib/format';
import { useEvaluation, weightsValid } from '../state/EvaluationContext';

export function EvaluatePage() {
  const { meta, weights, selectedIds, alternatives } = useEvaluation();
  const [result, setResult] = useState<TopsisResult | null>(null);
  const [used, setUsed] = useState<Alternative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canRun = weightsValid(weights) && selectedIds.length >= 2;

  // Recalcula en el backend cada vez que cambian los pesos o la selección (con una pequeña espera).
  useEffect(() => {
    if (!canRun) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.topsis(weights, selectedIds);
        if (cancelled) return;
        setResult(res.result);
        setUsed(res.alternatives);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [weights, selectedIds, canRun, alternatives]);

  if (!meta) return null;
  const winner = result?.ranking[0];
  const winnerModel = winner ? used[winner.index] : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-6">
          <WeightsPanel />
          <ModelPicker />
        </div>

        <section className="min-w-0 space-y-4">
          {error && <div className="rounded-lg bg-critical-soft px-4 py-3 text-sm text-critical">⚠ {error}</div>}
          {!canRun && <div className="rounded-lg bg-warning-soft px-4 py-3 text-sm">Completá los pesos (100 %) y elegí al menos 2 modelos para ver el ranking.</div>}
          {result && winner && (
            <div className={`space-y-4 transition-opacity ${loading || !canRun ? 'opacity-50' : ''}`}>
              <div className="card p-5">
                <p className="text-sm text-ink-2">Modelo recomendado</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-3xl font-semibold">{winner.alternative}</span>
                  <span className="text-ink-2">
                    {winnerModel?.provider} · C = <strong className="tabular text-ink">{fmt(winner.closeness, 4)}</strong>
                  </span>
                </div>
                {result.ranking.filter((r) => r.rank === 1).length > 1 && (
                  <p className="mt-2 text-sm text-critical">Empate en el primer puesto entre {result.ranking.filter((r) => r.rank === 1).map((r) => r.alternative).join(', ')}.</p>
                )}
              </div>
              <div className="card p-5">
                <h2 className="text-base font-semibold">Ranking por coeficiente de proximidad relativa</h2>
                <p className="mb-3 text-sm text-ink-2">
                  C<sub>i</sub> = 1 significa que la alternativa coincide con la solución ideal positiva; C<sub>i</sub> = 0, con la ideal negativa.
                </p>
                <RankingChart ranking={result.ranking} />
              </div>
              {result.warnings.map((w) => (
                <div key={w} className="rounded-lg bg-warning-soft px-4 py-2 text-sm">
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {result && <StepsView result={result} criteria={meta.criteria} />}
    </div>
  );
}
