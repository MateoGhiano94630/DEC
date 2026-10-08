import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankingEntry } from '../engine/topsis';
import { fmt } from '../lib/format';

/** Barras horizontales con el coeficiente C_i de cada alternativa, ordenadas por ranking. */
export function RankingChart({ ranking }: { ranking: RankingEntry[] }) {
  const data = ranking.map((r) => ({ name: `${r.rank}º ${r.alternative}`, c: r.closeness }));
  const narrow = useNarrow();
  // Ancho del eje de nombres según el nombre más largo, acotado en pantallas angostas.
  const labelWidth = Math.min(narrow ? 130 : 220, 12 + 7.2 * Math.max(...data.map((d) => d.name.length)));
  return (
    <div style={{ height: 44 + data.length * 34 }} role="img" aria-label="Gráfico de barras del coeficiente de proximidad por modelo">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => fmt(v, 2)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={labelWidth} stroke="var(--axis)" tick={{ fill: 'var(--ink-2)', fontSize: narrow ? 11 : 13 }} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            formatter={(v) => [fmt(Number(v), 6), 'C_i']}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)' }}
            labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
          />
          <Bar dataKey="c" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="c" position="right" formatter={(v) => fmt(Number(v), 4)} style={{ fill: 'var(--ink-2)', fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useNarrow(): boolean {
  const query = '(max-width: 640px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
