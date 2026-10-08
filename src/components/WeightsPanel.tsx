import { CUSTOM_PROFILE, useEvaluation, weightSum, weightsValid } from '../state/EvaluationContext';
import { fmt } from '../lib/format';

/** Selector de perfil predefinido + asignación libre de pesos. */
export function WeightsPanel() {
  const { meta, weights, profileId, setWeights, applyProfile } = useEvaluation();
  if (!meta) return null;
  const sum = weightSum(weights);
  const valid = weightsValid(weights);

  const setOne = (j: number, percent: number) => {
    const next = [...weights];
    next[j] = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0)) / 100;
    setWeights(next);
  };
  const normalize = () => sum > 0 && setWeights(weights.map((w) => w / sum));

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold">1. Ponderación de criterios</h2>
      <p className="mt-1 text-sm text-ink-2">Elegí un perfil predefinido o ajustá los pesos a mano. La suma debe ser 100 %.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {meta.profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyProfile(p.id)}
            title={p.description}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              profileId === p.id ? 'border-accent bg-accent-soft font-semibold text-accent-ink' : 'border-line hover:bg-surface-2'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted">
        {profileId === CUSTOM_PROFILE
          ? 'Asignación libre (perfil personalizado).'
          : meta.profiles.find((p) => p.id === profileId)?.description}
      </p>

      <div className="mt-3 space-y-3">
        {meta.criteria.map((c, j) => (
          <div key={c.code}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <label htmlFor={`w-${c.code}`} className="font-medium">
                <span className="text-muted">{c.code}</span> {c.name}{' '}
                <span className={`ml-1 rounded px-1.5 py-0.5 text-[11px] font-normal ${c.type === 'cost' ? 'bg-warning-soft' : 'bg-surface-2'} text-ink-2`}>
                  {c.type === 'cost' ? 'minimizar' : 'maximizar'}
                </span>
              </label>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  aria-label={`Peso de ${c.name} en porcentaje`}
                  value={Number((weights[j] * 100).toFixed(4))}
                  onChange={(e) => setOne(j, e.target.valueAsNumber)}
                  className="tabular w-20 rounded border border-line bg-surface px-2 py-0.5 text-right"
                />
                <span className="text-muted">%</span>
              </span>
            </div>
            <input
              id={`w-${c.code}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[j] * 100}
              onChange={(e) => setOne(j, e.target.valueAsNumber)}
              className="mt-1 w-full"
            />
          </div>
        ))}
      </div>

      <div className={`mt-4 flex items-center justify-between rounded-lg px-3 py-2 text-sm ${valid ? 'bg-surface-2' : 'bg-critical-soft'}`}>
        <span>
          Suma: <strong className="tabular">{fmt(sum * 100, 2)} %</strong>
          {!valid && <span className="ml-2 text-critical">⚠ debe ser 100 %</span>}
        </span>
        {!valid && sum > 0 && (
          <button type="button" onClick={normalize} className="rounded-md bg-accent px-3 py-1 text-white hover:opacity-90">
            Normalizar a 100 %
          </button>
        )}
      </div>
    </section>
  );
}
