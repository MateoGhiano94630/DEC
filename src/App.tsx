import { NavLink, Route, Routes } from 'react-router-dom';
import { EvaluatePage } from './pages/EvaluatePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ModelsPage } from './pages/ModelsPage';
import { SensitivityPage } from './pages/SensitivityPage';
import { useEvaluation } from './state/EvaluationContext';

const LINKS = [
  { to: '/', label: 'Evaluar' },
  { to: '/sensibilidad', label: 'Sensibilidad' },
  { to: '/modelos', label: 'Modelos' },
  { to: '/metodologia', label: 'Metodología' },
];

export default function App() {
  const { meta, loadError } = useEvaluation();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <div className="text-lg font-semibold">Selección de modelos de IA · TOPSIS</div>
            <div className="text-xs text-muted">Decisiones en Escenarios Complejos · UTN FRC · 5K2 · Grupo 6</div>
          </div>
          <nav className="-mx-1 flex max-w-full gap-1 overflow-x-auto">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) => `shrink-0 rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-ink-2 hover:bg-surface-2'}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loadError && <div className="rounded-lg bg-critical-soft px-4 py-3 text-sm text-critical">No se pudo conectar con la API: {loadError}</div>}
        {!meta && !loadError && <p className="text-ink-2">Cargando…</p>}
        {meta && (
          <Routes>
            <Route path="/" element={<EvaluatePage />} />
            <Route path="/sensibilidad" element={<SensitivityPage />} />
            <Route path="/modelos" element={<ModelsPage />} />
            <Route path="/metodologia" element={<MethodologyPage />} />
            <Route path="*" element={<EvaluatePage />} />
          </Routes>
        )}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted sm:px-6">Fasano, María Luz · Gallino, Gerónimo · Ghiano, Mateo</footer>
    </div>
  );
}
