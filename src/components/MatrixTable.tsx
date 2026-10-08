import type { ReactNode } from 'react';
import { fmt } from '../lib/format';

interface Props {
  rowLabels: string[];
  colLabels: string[];
  values: number[][];
  decimals?: number;
  /** Formateador alternativo por columna (p. ej. para valores brutos). */
  format?: (x: number, j: number) => string;
  /** Filas extra al pie (normas, SIP, SIN…). */
  footer?: { label: ReactNode; values: (number | string)[]; tone?: 'good' | 'bad' | 'muted' }[];
  highlight?: (i: number, j: number) => boolean;
  corner?: string;
}

/** Tabla de una matriz numérica con encabezados, usada en cada paso de TOPSIS. */
export function MatrixTable({ rowLabels, colLabels, values, decimals = 4, format, footer = [], highlight, corner = '' }: Props) {
  const show = (x: number | string, j: number) => (typeof x === 'string' ? x : format ? format(x, j) : fmt(x, decimals));
  const toneClass = { good: 'text-good', bad: 'text-critical', muted: 'text-muted' } as const;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="tabular w-full text-sm">
        <thead className="bg-surface-2 text-ink-2">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{corner}</th>
            {colLabels.map((c) => (
              <th key={c} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, i) => (
            <tr key={rowLabels[i]} className="border-t border-line">
              <td className="px-3 py-1.5 whitespace-nowrap">{rowLabels[i]}</td>
              {row.map((x, j) => (
                <td key={j} className={`px-3 py-1.5 text-right ${highlight?.(i, j) ? 'font-semibold text-accent-ink' : ''}`}>
                  {show(x, j)}
                </td>
              ))}
            </tr>
          ))}
          {footer.map((f, k) => (
            <tr key={k} className={`border-t ${k === 0 ? 'border-axis border-t-2' : 'border-line'} bg-surface-2/60`}>
              <td className="px-3 py-1.5 font-medium whitespace-nowrap">{f.label}</td>
              {f.values.map((x, j) => (
                <td key={j} className={`px-3 py-1.5 text-right font-medium ${f.tone ? toneClass[f.tone] : ''}`}>
                  {show(x, j)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
