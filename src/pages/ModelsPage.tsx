import { useState, type FormEvent, type ReactNode } from 'react';
import { blendedCost } from '../domain/criteria';
import type { Alternative, AlternativeInput } from '../domain/types';
import { api, ApiError, getAdminToken, setAdminToken } from '../lib/api';
import { fmt, fmtTokens } from '../lib/format';
import { useEvaluation } from '../state/EvaluationContext';

const EMPTY: AlternativeInput = {
  name: '',
  provider: '',
  variant: '',
  openWeights: false,
  priceInput: 0,
  priceOutput: 0,
  intelligenceIndex: 0,
  contextWindow: 128000,
  outputSpeed: 0,
  multimodalScore: 1,
  privacyScore: 3,
  notes: '',
  sourceUrl: '',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-line bg-surface px-3 py-1.5';

function AlternativeForm({ initial, onCancel, onSaved }: { initial: Alternative | null; onCancel: () => void; onSaved: () => void }) {
  const { meta } = useEvaluation();
  const [form, setForm] = useState<AlternativeInput>(() => {
    if (!initial) return EMPTY;
    const { id: _id, updatedAt: _u, ...rest } = initial;
    return rest;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof AlternativeInput>(k: K, v: AlternativeInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k: keyof AlternativeInput) => ({
    type: 'number' as const,
    className: `${inputCls} tabular`,
    value: Number.isFinite(form[k] as number) ? (form[k] as number) : '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.valueAsNumber as never),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) await api.updateAlternative(initial.id, form);
      else await api.createAlternative(form);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details.map((d) => `${d.path}: ${d.message}`));
      else setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setSaving(false);
    }
  };

  const rubric = (code: string) => meta?.criteria.find((c) => c.code === code)?.rubric ?? [];

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h2 className="text-base font-semibold">{initial ? `Editar ${initial.name}` : 'Nuevo modelo'}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nombre">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Proveedor">
          <input className={inputCls} value={form.provider} onChange={(e) => set('provider', e.target.value)} required />
        </Field>
        <Field label="Variante" hint="nivel de esfuerzo, versión">
          <input className={inputCls} value={form.variant} onChange={(e) => set('variant', e.target.value)} />
        </Field>
        <Field label="Precio de entrada" hint="USD / 1M tokens">
          <input {...num('priceInput')} min={0} step="any" />
        </Field>
        <Field label="Precio de salida" hint="USD / 1M tokens">
          <input {...num('priceOutput')} min={0} step="any" />
        </Field>
        <Field label="C1 · Costo ponderado" hint="(3·in + out) / 4">
          <div className="tabular rounded-md bg-surface-2 px-3 py-1.5">{fmt(blendedCost(form.priceInput || 0, form.priceOutput || 0), 3)}</div>
        </Field>
        <Field label="C2 · Intelligence Index" hint="0–100">
          <input {...num('intelligenceIndex')} min={0} max={100} step="any" />
        </Field>
        <Field label="C3 · Ventana de contexto" hint="tokens">
          <input {...num('contextWindow')} min={1} step={1} />
        </Field>
        <Field label="C4 · Velocidad" hint="tokens / s">
          <input {...num('outputSpeed')} min={0} step="any" />
        </Field>
        <Field label="C5 · Multimodal">
          <select className={inputCls} value={form.multimodalScore} onChange={(e) => set('multimodalScore', Number(e.target.value))}>
            {rubric('C5').map((r) => (
              <option key={r.score} value={r.score}>
                {r.score} — {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="C6 · Privacidad">
          <select className={inputCls} value={form.privacyScore} onChange={(e) => set('privacyScore', Number(e.target.value))}>
            {rubric('C6').map((r) => (
              <option key={r.score} value={r.score}>
                {r.score} — {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pesos abiertos">
          <label className="flex items-center gap-2 py-1.5">
            <input type="checkbox" checked={form.openWeights} onChange={(e) => set('openWeights', e.target.checked)} /> Sí, autoalojable
          </label>
        </Field>
      </div>
      <Field label="Justificación de C5 / C6">
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <Field label="Fuente (URL)">
        <input className={inputCls} type="url" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
      </Field>
      {errors.length > 0 && (
        <ul className="rounded-lg bg-critical-soft px-4 py-2 text-sm text-critical">
          {errors.map((e) => (
            <li key={e}>⚠ {e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button disabled={saving} className="rounded-md bg-accent px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-1.5 text-sm hover:bg-surface-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ModelsPage() {
  const { alternatives, reloadAlternatives, meta } = useEvaluation();
  const [editing, setEditing] = useState<Alternative | null | 'new'>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [token, setToken] = useState(getAdminToken);

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    try {
      await fn();
      await reloadAlternatives();
      setMessage({ tone: 'ok', text: okText });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Matriz de decisión · modelos</h1>
          <p className="text-sm text-ink-2">
            Alta, baja y modificación de alternativas. Almacenamiento: {meta?.storage === 'postgres' ? 'Postgres (Neon)' : 'memoria (sin DATABASE_URL, no persiste)'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            placeholder="Clave de administración"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setAdminToken(e.target.value);
            }}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
          />
          <button onClick={() => setEditing('new')} className="rounded-md bg-accent px-4 py-1.5 text-sm text-white hover:opacity-90">
            + Nuevo modelo
          </button>
          <button
            onClick={() => confirm('¿Restablecer la matriz a los datos originales? Se perderán los cambios.') && run(api.resetAlternatives, 'Datos semilla restablecidos.')}
            className="rounded-md border border-line px-4 py-1.5 text-sm hover:bg-surface-2"
          >
            Restablecer datos
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm ${message.tone === 'ok' ? 'bg-accent-soft text-accent-ink' : 'bg-critical-soft text-critical'}`}>{message.text}</div>
      )}

      {editing && (
        <AlternativeForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reloadAlternatives();
            setMessage({ tone: 'ok', text: 'Modelo guardado.' });
          }}
        />
      )}

      <div className="card overflow-x-auto">
        <table className="tabular w-full text-sm">
          <thead className="bg-surface-2 text-ink-2">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Modelo</th>
              <th className="px-3 py-2 text-right font-medium">C1 USD/1M</th>
              <th className="px-3 py-2 text-right font-medium">C2 Índice</th>
              <th className="px-3 py-2 text-right font-medium">C3 Contexto</th>
              <th className="px-3 py-2 text-right font-medium">C4 tok/s</th>
              <th className="px-3 py-2 text-right font-medium">C5</th>
              <th className="px-3 py-2 text-right font-medium">C6</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {alternatives.map((a) => (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted">
                    {a.provider}
                    {a.variant && a.variant !== '—' ? ` · ${a.variant}` : ''}
                    {a.openWeights ? ' · pesos abiertos' : ''}
                  </div>
                  {a.notes && <div className="mt-1 max-w-md text-xs text-ink-2">{a.notes}</div>}
                  {a.sourceUrl && (
                    <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-ink hover:underline">
                      Fuente
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 text-right" title={`in ${a.priceInput} / out ${a.priceOutput}`}>
                  {fmt(blendedCost(a.priceInput, a.priceOutput), 3)}
                </td>
                <td className="px-3 py-2 text-right">{fmt(a.intelligenceIndex, 2)}</td>
                <td className="px-3 py-2 text-right" title={String(a.contextWindow)}>
                  {fmtTokens(a.contextWindow)}
                </td>
                <td className="px-3 py-2 text-right">{fmt(a.outputSpeed, 1)}</td>
                <td className="px-3 py-2 text-right">{a.multimodalScore}</td>
                <td className="px-3 py-2 text-right">{a.privacyScore}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(a)} className="text-accent-ink hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => confirm(`¿Eliminar ${a.name}?`) && run(() => api.deleteAlternative(a.id), `${a.name} eliminado.`)}
                    className="ml-3 text-critical hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
