import { useState, type ReactNode } from 'react';
import type { CriterionDef } from '../domain/criteria';
import type { TopsisResult } from '../engine/topsis';
import { fmt, fmtRaw, pct } from '../lib/format';
import { MatrixTable } from './MatrixTable';
import { Tex } from './Tex';

function Step({ n, title, formula, children, defaultOpen = false }: { n: number; title: string; formula?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 select-none">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">{n}</span>
        <span className="font-medium">{title}</span>
        <span className="ml-auto text-muted transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 border-t border-line px-5 py-4">
        {formula && <Tex block>{formula}</Tex>}
        {children}
      </div>
    </details>
  );
}

/** Desarrollo completo del método, paso por paso, con las fórmulas y las matrices intermedias. */
export function StepsView({ result, criteria }: { result: TopsisResult; criteria: CriterionDef[] }) {
  const [decimals, setDecimals] = useState(4);
  const cols = criteria.map((c) => c.code);
  const rows = result.alternatives;
  const typeRow = criteria.map((c) => (c.type === 'cost' ? 'mín' : 'máx'));
  const isIdeal = (i: number, j: number) => result.weighted[i][j] === result.idealPositive[j];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Desarrollo paso a paso</h2>
        <label className="text-sm text-ink-2">
          Decimales{' '}
          <select value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} className="rounded border border-line bg-surface px-2 py-1">
            {[2, 4, 6, 8, 10].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <Step n={0} title="Matriz de decisión" formula={String.raw`X = [x_{ij}]_{${rows.length}\times${cols.length}}`}>
        <p className="text-sm text-ink-2">
          Valores brutos de cada modelo. C1 ya es el costo ponderado <Tex>{String.raw`(3\,p_{in} + p_{out})/4`}</Tex>.
        </p>
        <MatrixTable
          rowLabels={rows}
          colLabels={cols}
          values={result.matrix}
          format={(x, j) => fmtRaw(x, cols[j])}
          footer={[
            { label: 'Sentido', values: typeRow, tone: 'muted' },
            { label: 'Peso w_j', values: result.weights.map((w) => pct(w)) },
          ]}
        />
      </Step>

      <Step n={1} title="Normalización vectorial" formula={String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`}>
        <MatrixTable
          rowLabels={rows}
          colLabels={cols}
          values={result.normalized}
          decimals={decimals}
          footer={[{ label: <Tex>{String.raw`\sqrt{\sum x_{ij}^2}`}</Tex>, values: result.columnNorms.map((x) => fmt(x, decimals)), tone: 'muted' }]}
        />
      </Step>

      <Step n={2} title="Matriz normalizada ponderada" formula={String.raw`v_{ij} = w_j \cdot r_{ij}`}>
        <MatrixTable rowLabels={rows} colLabels={cols} values={result.weighted} decimals={decimals} footer={[{ label: 'w_j', values: result.weights.map((w) => fmt(w, decimals)), tone: 'muted' }]} />
      </Step>

      <Step
        n={3}
        title="Solución ideal positiva (SIP) y negativa (SIN)"
        formula={String.raw`A^{+}_j = \begin{cases}\max_i v_{ij} & j \in \text{beneficio}\\ \min_i v_{ij} & j \in \text{costo}\end{cases} \qquad A^{-}_j = \begin{cases}\min_i v_{ij} & j \in \text{beneficio}\\ \max_i v_{ij} & j \in \text{costo}\end{cases}`}
      >
        <p className="text-sm text-ink-2">En negrita, los valores de cada alternativa que alcanzan la SIP.</p>
        <MatrixTable
          rowLabels={rows}
          colLabels={cols}
          values={result.weighted}
          decimals={decimals}
          highlight={isIdeal}
          footer={[
            { label: <>SIP A<sup>+</sup></>, values: result.idealPositive, tone: 'good' },
            { label: <>SIN A<sup>−</sup></>, values: result.idealNegative, tone: 'bad' },
          ]}
        />
      </Step>

      <Step
        n={4}
        title="Distancias euclidianas"
        formula={String.raw`D^{+}_i = \sqrt{\sum_{j=1}^{n}\left(v_{ij} - A^{+}_j\right)^2} \qquad D^{-}_i = \sqrt{\sum_{j=1}^{n}\left(v_{ij} - A^{-}_j\right)^2}`}
      >
        <MatrixTable
          rowLabels={rows}
          colLabels={['D⁺ (a la SIP)', 'D⁻ (a la SIN)']}
          values={rows.map((_, i) => [result.distancePositive[i], result.distanceNegative[i]])}
          decimals={decimals}
        />
      </Step>

      <Step n={5} title="Coeficiente de proximidad relativa y ranking" formula={String.raw`C_i = \frac{D^{-}_i}{D^{+}_i + D^{-}_i}, \qquad 0 \le C_i \le 1`}>
        <MatrixTable
          corner="Puesto"
          rowLabels={result.ranking.map((r) => `${r.rank}º  ${r.alternative}`)}
          colLabels={['D⁺', 'D⁻', 'D⁺ + D⁻', 'C_i']}
          values={result.ranking.map((r) => {
            const dp = result.distancePositive[r.index];
            const dn = result.distanceNegative[r.index];
            return [dp, dn, dp + dn, r.closeness];
          })}
          decimals={decimals}
          highlight={(i, j) => i === 0 && j === 3}
        />
      </Step>
    </section>
  );
}
