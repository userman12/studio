import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import psicologia from './data/psicologia.json';
import economia from './data/economia.json';
import type { Materia, MateriaId } from './types';
import { leer } from './store';
import { mejorPuntuacion } from './quizLogic';
import { Puntos } from './Puntos';
import { Pildoras } from './Pildoras';
import { Quiz } from './Quiz';
import { Progreso } from './Progreso';
import s from './ui.module.css';

export const MATERIAS: Record<MateriaId, Materia> = {
  psicologia: psicologia as Materia,
  economia: economia as Materia,
};

/** Renders **bold** as a highlighter stroke. Text only — never HTML. */
export function Md({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <mark key={i} className={s.hl}>{part}</mark> : <Fragment key={i}>{part}</Fragment>))}</>;
}

/** Stats used on Home and Progreso. Ignores stored ids that no longer exist in the content. */
export function resumen(m: Materia) {
  const p = leer(m.id);
  const sabidas = m.pildoras.filter((x) => p.pildoras[x.id] === 'se').length;
  const ids = new Set(m.preguntas.map((q) => q.id));
  return {
    pctPildoras: Math.round((100 * sabidas) / m.pildoras.length),
    sabidas,
    mejor: mejorPuntuacion(p.historial),
    errores: Object.keys(p.errores).filter((id) => ids.has(id)).length,
  };
}

type Tema = 'auto' | 'light' | 'dark';
const TEMA_KEY = 'estudio:tema';
function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(() => {
    try { return (localStorage.getItem(TEMA_KEY) as Tema) || 'auto'; } catch { return 'auto'; }
  });
  useEffect(() => {
    if (tema === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', tema);
    try { localStorage.setItem(TEMA_KEY, tema); } catch { /* storage unavailable: theme just won't persist */ }
  }, [tema]);
  const next: Record<Tema, Tema> = { auto: 'light', light: 'dark', dark: 'auto' };
  const label: Record<Tema, string> = { auto: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: oscuro' };
  return <button type="button" className={s.iconBtn} onClick={() => setTema(next[tema])} aria-label={`${label[tema]}. Cambiar tema`}>{tema === 'auto' ? '◐' : tema === 'light' ? '☀' : '☾'}</button>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <Link to="/" className={s.brand}>Estudio</Link>
        <span className={s.spacer} />
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}

function Home() {
  return (
    <Shell>
      <div className={s.homeHead}>
        <h1 className={s.homeTitle}>¿Qué <mark className={`${s.hl} ${s.psicologia}`}>estudiamos</mark> hoy?</h1>
      </div>
      <div className={s.subjects}>
        {Object.values(MATERIAS).map((m) => {
          const r = resumen(m);
          return (
            <Link key={m.id} to={`/${m.id}/puntos`} className={`${s.subject} ${s[m.id]}`}>
              <h2 className={s.subjectName}><mark className={s.hl}>{m.nombre}</mark></h2>
              <span className={s.muted}>{m.temas.length} temas · {m.pildoras.length} píldoras · {m.preguntas.length} preguntas</span>
              <div className={s.bar} aria-hidden="true"><div className={s.barFill} style={{ width: `${r.pctPildoras}%` }} /></div>
              <div className={s.stats}>
                <div className={s.stat}><span className={s.statNum}>{r.pctPildoras}%</span><span className={s.statLabel}>píldoras que ya sabes</span></div>
                <div className={s.stat}><span className={s.statNum}>{r.mejor == null ? '—' : `${r.mejor}%`}</span><span className={s.statLabel}>mejor quiz</span></div>
                <div className={s.stat}><span className={s.statNum}>{r.errores}</span><span className={s.statLabel}>falladas por repasar</span></div>
              </div>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}

const SECCIONES = [
  ['puntos', 'Puntos clave'],
  ['pildoras', 'Píldoras'],
  ['quiz', 'Quiz'],
  ['progreso', 'Progreso'],
] as const;

function MateriaLayout() {
  const { materia } = useParams();
  const m = MATERIAS[materia as MateriaId];
  if (!m) return <Navigate to="/" replace />;
  return (
    <Shell>
      <div className={s[m.id]}>
        <h1 className={s.pageTitle}><mark className={s.hl}>{m.nombre}</mark></h1>
        <nav className={s.tabs} aria-label="Secciones">
          {SECCIONES.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>{label}</NavLink>
          ))}
        </nav>
        <Outlet context={m} />
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:materia" element={<MateriaLayout />}>
          <Route index element={<Navigate to="puntos" replace />} />
          <Route path="puntos" element={<Puntos />} />
          <Route path="pildoras" element={<Pildoras />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="progreso" element={<Progreso />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
