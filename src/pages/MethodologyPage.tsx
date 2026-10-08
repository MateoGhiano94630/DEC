import type { ReactNode } from 'react';
import { Tex } from '../components/Tex';
import { pct } from '../lib/format';
import { useEvaluation } from '../state/EvaluationContext';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-3 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export function MethodologyPage() {
  const { meta } = useEvaluation();
  if (!meta) return null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Section title="¿Qué es TOPSIS?">
        <p>
          TOPSIS (<em>Technique for Order of Preference by Similarity to Ideal Solution</em>, Hwang &amp; Yoon, 1981) ordena <Tex>m</Tex> alternativas
          evaluadas en <Tex>n</Tex> criterios según su cercanía geométrica a una <strong>solución ideal positiva</strong> (lo mejor en cada criterio) y su
          lejanía de una <strong>solución ideal negativa</strong> (lo peor). La mejor alternativa es la que está más cerca de la primera y, a la vez, más lejos
          de la segunda.
        </p>
        <p>
          Es un método compensatorio: un mal desempeño en un criterio puede compensarse con uno bueno en otro, en la medida que indiquen los pesos.
        </p>
      </Section>

      <Section title="Algoritmo implementado">
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <strong>Normalización vectorial</strong>: vuelve comparables criterios con unidades distintas (USD, tokens, puntos).
            <Tex block>{String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^{2}}}`}</Tex>
          </li>
          <li>
            <strong>Ponderación</strong> con los pesos del usuario (<Tex>{String.raw`\sum_j w_j = 1`}</Tex>):
            <Tex block>{String.raw`v_{ij} = w_j \, r_{ij}`}</Tex>
          </li>
          <li>
            <strong>Soluciones ideales</strong>. Para criterios de beneficio el ideal es el máximo; para criterios de costo (C1), el mínimo:
            <Tex block>{String.raw`A^{+} = \{\max_i v_{ij} \mid j \in B;\ \min_i v_{ij} \mid j \in C\} \qquad A^{-} = \{\min_i v_{ij} \mid j \in B;\ \max_i v_{ij} \mid j \in C\}`}</Tex>
          </li>
          <li>
            <strong>Distancias euclidianas</strong> a cada solución ideal:
            <Tex block>{String.raw`D_i^{+} = \sqrt{\sum_{j=1}^{n} (v_{ij} - A_j^{+})^2} \qquad D_i^{-} = \sqrt{\sum_{j=1}^{n} (v_{ij} - A_j^{-})^2}`}</Tex>
          </li>
          <li>
            <strong>Coeficiente de proximidad relativa</strong>; el ranking ordena <Tex>C_i</Tex> de mayor a menor:
            <Tex block>{String.raw`C_i = \frac{D_i^{-}}{D_i^{+} + D_i^{-}} \in [0, 1]`}</Tex>
          </li>
        </ol>
      </Section>

      <Section title="Criterios">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 pr-3">Criterio</th>
                <th className="py-2 pr-3">Sentido</th>
                <th className="py-2 pr-3">Unidad</th>
                <th className="py-2">Medición</th>
              </tr>
            </thead>
            <tbody>
              {meta.criteria.map((c) => (
                <tr key={c.code} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-medium text-ink">{c.code}</td>
                  <td className="py-2 pr-3 text-ink">{c.name}</td>
                  <td className="py-2 pr-3">{c.type === 'cost' ? 'Minimizar' : 'Maximizar'}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{c.unit}</td>
                  <td className="py-2">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.criteria
          .filter((c) => c.rubric)
          .map((c) => (
            <div key={c.code}>
              <h3 className="mt-2 font-semibold text-ink">
                Rúbrica {c.code} · {c.name}
              </h3>
              <ul className="mt-1 space-y-0.5">
                {c.rubric!.map((r) => (
                  <li key={r.score}>
                    <span className="tabular mr-2 inline-block w-5 rounded bg-surface-2 text-center font-semibold text-ink">{r.score}</span>
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </Section>

      <Section title="Perfiles predefinidos">
        <div className="overflow-x-auto">
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="border-b border-line text-ink">
                <th className="py-2 pr-3 text-left">Perfil</th>
                {meta.criteria.map((c) => (
                  <th key={c.code} className="px-2 py-2 text-right">
                    {c.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.profiles.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-2 pr-3 text-ink" title={p.description}>
                    {p.name}
                  </td>
                  {p.weights.map((w, j) => (
                    <td key={j} className={`px-2 py-2 text-right ${w === Math.max(...p.weights) ? 'font-semibold text-accent-ink' : ''}`}>
                      {pct(w, 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Consideraciones">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Casos límite.</strong> Si un criterio vale 0 en todas las alternativas, su columna normalizada se toma como 0 (no discrimina). Si todas
            las alternativas son idénticas, <Tex>{String.raw`D^{+} = D^{-} = 0`}</Tex> y se informa un empate con <Tex>{String.raw`C_i = 0{,}5`}</Tex>.
          </li>
          <li>
            <strong>Empates.</strong> Alternativas con el mismo <Tex>C_i</Tex> (tolerancia <Tex>{String.raw`10^{-12}`}</Tex>) comparten el puesto (ranking
            1, 2, 2, 4).
          </li>
          <li>
            <strong>Inversión de rangos.</strong> TOPSIS puede cambiar el orden relativo de dos alternativas al agregar o quitar una tercera, porque la
            normalización y las soluciones ideales dependen del conjunto evaluado.
          </li>
          <li>
            <strong>Datos.</strong> C1–C5 provienen de Artificial Analysis (25/09/2026); C6 surge de las políticas de datos publicadas por cada proveedor. Los
            valores pueden editarse desde la sección Modelos.
          </li>
        </ul>
      </Section>
    </div>
  );
}
