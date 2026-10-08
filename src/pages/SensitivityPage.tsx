import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { WeightsPanel } from '../components/WeightsPanel';
import type { Alternative } from '../domain/types';
import type { SensitivityResult } from '../engine/sensitivity';
import { api } from '../lib/api';
import { fmt, pct } from '../lib/format';
import { useEvaluation, weightsValid } from '../state/EvaluationContext';

const MAX_SERIES = 8;

/** Color fijo por entidad: la posición del modelo en la lista completa (nunca por ranking). */
function seriesColor(all: Alternative[], id: number): string {
  const slot = all.findIndex((a) => a.id === id);
  return slot >= 0 && slot < MAX_SERIES ? `var(--series-${slot + 1})` : 'var(--muted)';
}

export function SensitivityPage() {
  const { meta, weights, selectedIds, alternatives } = useEvaluation();
  const [criterion, setCriterion] = useState(1);
  const [data, setData] = useState<{ result: SensitivityResult; alternatives: Alternative[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const canRun = weightsValid(weights) && selectedIds.length >= 2;

  useEffect(() => {
    if (!canRun) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .sensitivity(weights, criterion, selectedIds, 100)
        .then((res) => !cancelled && (setData(res), setError(null)))
        .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [weights, criterion, selectedIds, canRun]);

  const rows = useMemo(
    () =>
      data?.result.points.map((p) => {
        const row: Record<string, number> = { w: p.weight };
        data.alternatives.forEach((a, i) => (row[a.name] = p.closeness[i]));
        return row;
      }) ?? [],
    [data],
  );

  if (!meta) return null;
  const c = meta.criteria[criterion];
  const names = data?.alternatives.map((a) => a.name) ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <WeightsPanel />
      <section className="min-w-0 space-y-4">
        <div className="card p-5">
          <h2 className="text-base font-semibold">Análisis de sensibilidad</h2>
          <p className="mt-1 text-sm text-ink-2">
            Se varía el peso de un criterio de 0 a 100 % y el resto se reparte entre los demás manteniendo sus proporciones. La línea vertical marca el peso actual.
          </p>
          <label className="mt-3 block text-sm">
            Criterio analizado{' '}
            <select value={criterion} onChange={(e) => setCriterion(Number(e.target.value))} className="ml-1 rounded border border-line bg-surface px-2 py-1">
              {meta.criteria.map((cr, j) => (
                <option key={cr.code} value={j}>
                  {cr.code} — {cr.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="mt-3 text-sm text-critical">⚠ {error}</p>}
          {!canRun && <p className="mt-3 text-sm text-critical">⚠ Los pesos deben sumar 100 % y debe haber al menos 2 modelos seleccionados.</p>}
          {names.length > MAX_SERIES && (
            <p className="mt-3 text-sm text-ink-2">Hay más de {MAX_SERIES} modelos: los que exceden la paleta se dibujan en gris. Filtrá desde “Evaluar” para compararlos mejor.</p>
          )}

          {data && (
            <div className="mt-4 h-96" role="img" aria-label={`Coeficiente de proximidad de cada modelo según el peso de ${c.name}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis
                    dataKey="w"
                    type="number"
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                    tickFormatter={(v) => pct(v, 0)}
                    stroke="var(--axis)"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    label={{ value: `Peso de ${c.code}`, position: 'insideBottom', offset: -12, fill: 'var(--muted)', fontSize: 12 }}
                  />
                  <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => fmt(v, 2)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} width={40} />
                  <Tooltip
                    labelFormatter={(v) => `Peso ${c.code}: ${pct(Number(v))}`}
                    formatter={(v, name) => [fmt(Number(v), 4), name]}
                    itemSorter={(item) => -Number(item.value)}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)', fontSize: 13 }}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, color: 'var(--ink-2)', paddingBottom: 12 }} />
                  <ReferenceLine x={weights[criterion]} stroke="var(--ink-2)" strokeDasharray="4 4" />
                  {data.alternatives.map((a) => (
                    <Line key={a.id} dataKey={a.name} stroke={seriesColor(alternatives, a.id)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {data && (
          <div className="card p-5 text-sm">
            <h3 className="font-semibold">Cambios de la alternativa ganadora</h3>
            {data.result.winnerChanges.length === 0 ? (
              <p className="mt-1 text-ink-2">
                <strong>{names[data.result.points[0].winner]}</strong> gana para cualquier peso de {c.code}: el resultado es robusto frente a este criterio.
              </p>
            ) : (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                {data.result.winnerChanges.map((ch) => (
                  <li key={ch.weight}>
                    Con {c.code} ≈ <span className="tabular">{pct(ch.weight)}</span>: <strong>{names[ch.from]}</strong> → <strong>{names[ch.to]}</strong>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="mt-3 text-accent-ink hover:underline" onClick={() => setShowTable((s) => !s)}>
              {showTable ? 'Ocultar tabla' : 'Ver datos en tabla'}
            </button>
            {showTable && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                <table className="tabular w-full text-xs">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className="px-2 py-1 text-left">Peso {c.code}</th>
                      {names.map((n) => (
                        <th key={n} className="px-2 py-1 text-right whitespace-nowrap">
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.result.points
                      .filter((_, k) => k % 10 === 0)
                      .map((p) => (
                        <tr key={p.weight} className="border-t border-line">
                          <td className="px-2 py-1">{pct(p.weight, 0)}</td>
                          {p.closeness.map((x, i) => (
                            <td key={i} className={`px-2 py-1 text-right ${i === p.winner ? 'font-semibold text-accent-ink' : ''}`}>
                              {fmt(x, 4)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
