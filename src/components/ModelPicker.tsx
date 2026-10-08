import { useEvaluation } from '../state/EvaluationContext';

/** Selección del subconjunto de modelos (alternativas) a evaluar. */
export function ModelPicker() {
  const { alternatives, selectedIds, setSelectedIds } = useEvaluation();
  const selected = new Set(selectedIds);
  const toggle = (id: number) => setSelectedIds(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">2. Alternativas</h2>
        <span className="text-xs text-muted">
          {selectedIds.length} de {alternatives.length}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {alternatives.map((a) => (
          <label
            key={a.id}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition select-none ${
              selected.has(a.id) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-muted line-through'
            }`}
          >
            <input type="checkbox" className="sr-only" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
            {a.name}
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-xs">
        <button type="button" className="text-accent-ink hover:underline" onClick={() => setSelectedIds(alternatives.map((a) => a.id))}>
          Seleccionar todas
        </button>
      </div>
      {selectedIds.length < 2 && <p className="mt-2 text-sm text-critical">⚠ Seleccioná al menos 2 modelos.</p>}
    </section>
  );
}
