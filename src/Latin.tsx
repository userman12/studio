import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import latin from './data/latin.json';
import epica from './data/epica.json';
import type { Materia } from './types';
import { crearEjercicio, formaEn, normalizar, todasLasPalabras, type DatosLatin, type Ejercicio } from './latinLogic';
import { mejorPuntuacion, registrarRespuesta, shuffle } from './quizLogic';
import { leer, useProgreso, vacio } from './store';
import s from './ui.module.css';

export const LATIN = latin as DatosLatin;
export const EPICA = epica as unknown as Materia; // empty pildoras[] infers never[]; shape is checked by npm run validate
const byId = Object.fromEntries(LATIN.prefijos.map((p) => [p.id, p]));
const PALABRAS = todasLasPalabras(LATIN);

/** Prefix flashcards, derived from the table: front = prefix, back = meaning + up to 3 examples. */
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const PREFIJOS_PILDORAS: Materia = {
  id: 'latin',
  nombre: 'Prefijos',
  temas: [{ id: 'lat-prefijos', titulo: 'Prefijos de origen latino', orden: 1 }],
  puntosClave: [],
  preguntas: [],
  pildoras: LATIN.prefijos.map((p) => ({
    id: `lat-pi-${p.id}`,
    temaId: 'lat-prefijos',
    frente: p.etiqueta,
    reverso: `${mayus(p.significado)}. Ej.: ${p.ejemplos.slice(0, 3).join(', ')}.`,
    fuente: `${LATIN.fuentePrefijos}, fila «${p.etiqueta}»`,
  })),
};
const NUM = '1234';
const LET = 'ABCD';

export function resumenLatin() {
  const p = leer('latin');
  const validas = new Set(PALABRAS.map((x) => x.palabra));
  const e = leer('epica');
  const ids = new Set(EPICA.preguntas.map((q) => q.id));
  return {
    mejor: mejorPuntuacion(p.historial),
    errores: Object.keys(p.errores).filter((w) => validas.has(w)).length,
    mejorEpica: mejorPuntuacion(e.historial),
    erroresEpica: Object.keys(e.errores).filter((id) => ids.has(id)).length,
  };
}

export function LatinLayout() {
  const { pathname } = useLocation();
  return (
    <div className={s.latin}>
      <h1 className={s.pageTitle}><mark className={s.hl}>Latín</mark></h1>
      <nav className={s.latinNav} aria-label="Secciones">
        <span className={s.latinGrupo}>Gramática</span>
        <NavLink to="prefijos" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Prefijos</NavLink>
        <NavLink to="pildoras" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Píldoras</NavLink>
        <NavLink to="ejercicio" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Ejercicio</NavLink>
        <span className={s.latinGrupo}>Épica</span>
        <NavLink to="epica/teoria" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Teoría</NavLink>
        <NavLink to="epica/pildoras" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Píldoras</NavLink>
        <NavLink to="epica/quiz" className={({ isActive }) => (isActive ? s.tabActive : s.tab)}>Quiz</NavLink>
      </nav>
      <Outlet context={pathname.includes('/epica/') ? EPICA : PREFIJOS_PILDORAS} />
    </div>
  );
}

/** The word with its prefix drawn as a highlighter stroke. */
function PalabraMarcada({ palabra, prefijoId }: { palabra: string; prefijoId: string }) {
  const f = formaEn(byId[prefijoId], palabra);
  if (!f) return <>{palabra}</>;
  return <><mark className={s.hl}>{palabra.slice(0, f.length)}</mark>{palabra.slice(f.length)}</>;
}

export function Prefijos() {
  const [q, setQ] = useState('');
  const t = normalizar(q.trim());
  const lista = LATIN.prefijos.filter((p) => !t || [p.etiqueta, p.significado, ...p.ejemplos].some((x) => normalizar(x).includes(t)));
  return (
    <div className={s.stack}>
      <label className={s.field}>
        Buscar prefijo, significado o palabra
        <input className={s.input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: sub-, encima de, trashumancia…" />
      </label>
      {lista.length === 0 && <div className={s.empty}><p>Nada coincide con «{q}».</p></div>}
      <div className={s.stack}>
        {lista.map((p) => (
          <div key={p.id} className={s.card}>
            <div className={s.row} style={{ alignItems: 'baseline' }}>
              <h3 style={{ fontSize: '1.3rem' }}>{p.etiqueta}</h3>
              <span>{p.significado}</span>
            </div>
            <p className={s.muted} style={{ margin: '8px 0 0' }}>
              {p.ejemplos.map((w, i) => <span key={w}>{i > 0 && ', '}<PalabraMarcada palabra={w} prefijoId={p.id} /></span>)}
            </p>
          </div>
        ))}
      </div>
      <p className={s.fuente}>{LATIN.fuentePrefijos}</p>
    </div>
  );
}

type Ronda = { items: Ejercicio[]; idx: number; prefijo: string | null; significado: string | null; comprobado: boolean; aciertos: boolean[] };
const TAMANOS = [10, 20, 'todas'] as const;

export function EjercicioPrefijos() {
  const [prog, update] = useProgreso('latin');
  const [n, setN] = useState<(typeof TAMANOS)[number]>(10);
  const [soloFalladas, setSoloFalladas] = useState(false);
  const [ronda, setRonda] = useState<Ronda | null>(null);
  const [fin, setFin] = useState<Ronda | null>(null);

  const pool = useMemo(() => PALABRAS.filter((x) => !soloFalladas || x.palabra in prog.errores), [soloFalladas, prog.errores]);

  const empezar = () => {
    if (!pool.length) return;
    const elegidas = shuffle(pool).slice(0, n === 'todas' ? undefined : n);
    setFin(null);
    setRonda({ items: elegidas.map((x) => crearEjercicio(LATIN, x.palabra, x.prefijoId)), idx: 0, prefijo: null, significado: null, comprobado: false, aciertos: [] });
  };

  if (ronda) {
    const e = ronda.items[ronda.idx];
    const ultima = ronda.idx === ronda.items.length - 1;
    const comprobar = () => {
      if (!ronda.prefijo || !ronda.significado || ronda.comprobado) return;
      const ok = ronda.prefijo === e.correcto && ronda.significado === e.correcto;
      update((prev) => ({ ...prev, errores: registrarRespuesta(prev.errores, e.palabra, ok) }));
      setRonda({ ...ronda, comprobado: true, aciertos: [...ronda.aciertos, ok] });
    };
    const siguiente = () => {
      if (!ronda.comprobado) return;
      if (!ultima) return setRonda({ ...ronda, idx: ronda.idx + 1, prefijo: null, significado: null, comprobado: false });
      const correctas = ronda.aciertos.filter(Boolean).length;
      update((prev) => ({ ...prev, historial: [...prev.historial, { fecha: new Date().toISOString(), modo: soloFalladas ? 'repaso' : 'practica', correctas, total: ronda.items.length }] }));
      setFin(ronda);
      setRonda(null);
    };
    return <Pregunta key={ronda.idx} ronda={ronda} e={e} ultima={ultima}
      elegir={(campo, id) => !ronda.comprobado && setRonda({ ...ronda, [campo]: id })}
      comprobar={comprobar} siguiente={siguiente}
      salir={() => { if (confirm('¿Salir del ejercicio? Esta ronda no se guardará en el historial.')) setRonda(null); }} />;
  }

  if (fin) {
    const correctas = fin.aciertos.filter(Boolean).length;
    const falladas = fin.items.filter((_, i) => !fin.aciertos[i]);
    return (
      <div className={s.stack}>
        <div className={s.card}>
          <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>Resultado</p>
          <div className={s.score}>{Math.round((100 * correctas) / fin.items.length)}%</div>
          <p style={{ margin: '6px 0 0' }}>{correctas} de {fin.items.length} palabras con prefijo y significado correctos</p>
        </div>
        {falladas.length > 0 && (
          <div className={s.card}>
            <h3 style={{ marginBottom: 10 }}>Para repasar</h3>
            <ul className={s.stack} style={{ margin: 0, paddingLeft: 20 }}>
              {falladas.map((e) => (
                <li key={e.palabra}><strong><PalabraMarcada palabra={e.palabra} prefijoId={e.correcto} /></strong>: {byId[e.correcto].etiqueta} → {byId[e.correcto].significado}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={s.row}>
          <button type="button" className={s.btn} onClick={() => setFin(null)}>Cambiar opciones</button>
          <span className={s.spacer} />
          <button type="button" className={s.btnPrimary} onClick={empezar} disabled={!pool.length}>Otra ronda</button>
        </div>
      </div>
    );
  }

  const mejor = mejorPuntuacion(prog.historial);
  const nFalladas = PALABRAS.filter((x) => x.palabra in prog.errores).length;
  return (
    <div className={s.stack}>
      <p style={{ margin: 0 }}>Te muestro una palabra: elige su <strong>prefijo</strong> y el <strong>significado</strong> de ese prefijo.</p>
      <div className={s.row}>
        <label className={s.field}>
          Número de palabras
          <select className={s.select} value={String(n)} onChange={(ev) => setN(ev.target.value === 'todas' ? 'todas' : (Number(ev.target.value) as 10 | 20))}>
            {TAMANOS.map((t) => <option key={t} value={String(t)}>{t === 'todas' ? `Todas (${pool.length})` : t}</option>)}
          </select>
        </label>
        <label className={s.check}><input type="checkbox" checked={soloFalladas} onChange={(ev) => setSoloFalladas(ev.target.checked)} /> Solo falladas ({nFalladas})</label>
      </div>
      {pool.length === 0 ? (
        <div className={s.empty}><p>No tienes palabras falladas pendientes. ¡Bien!</p><button type="button" className={s.btn} onClick={() => setSoloFalladas(false)}>Practicar todas</button></div>
      ) : (
        <button type="button" className={s.btnPrimary} onClick={empezar}>Empezar · {n === 'todas' ? pool.length : Math.min(n, pool.length)} palabras</button>
      )}
      <p className={`${s.small} ${s.muted}`}>
        Una palabra fallada sale de «Solo falladas» tras 2 aciertos seguidos. Teclado: <span className={s.kbd}>1</span>–<span className={s.kbd}>4</span> prefijo, <span className={s.kbd}>A</span>–<span className={s.kbd}>D</span> significado, <span className={s.kbd}>Enter</span> comprobar / seguir.
      </p>
      <div className={s.card}>
        <h3 style={{ marginBottom: 8 }}>Tu progreso</h3>
        <p className={s.muted} style={{ margin: 0 }}>Mejor ronda: {mejor == null ? '—' : `${mejor}%`} · Rondas terminadas: {prog.historial.length} · Palabras por repasar: {nFalladas}</p>
        {prog.historial.length > 0 && (
          <button type="button" className={s.btnDanger} style={{ marginTop: 12 }} onClick={() => { if (confirm('¿Borrar el progreso de los prefijos (rondas, palabras falladas y píldoras de prefijos)? La épica no se toca. No se puede deshacer.')) update(() => vacio()); }}>Reiniciar progreso de prefijos</button>
        )}
      </div>
    </div>
  );
}

function Pregunta({ ronda, e, ultima, elegir, comprobar, siguiente, salir }: {
  ronda: Ronda; e: Ejercicio; ultima: boolean;
  elegir: (campo: 'prefijo' | 'significado', id: string) => void; comprobar: () => void; siguiente: () => void; salir: () => void;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (NUM.includes(k) && k.length === 1) { ev.preventDefault(); elegir('prefijo', e.opcionesPrefijo[NUM.indexOf(k)]); }
      else if ('abcd'.includes(k) && k.length === 1) { ev.preventDefault(); elegir('significado', e.opcionesSignificado['abcd'.indexOf(k)]); }
      else if (ev.key === 'Enter' && !(ev.target as HTMLElement).closest('button')) { ev.preventDefault(); if (ronda.comprobado) siguiente(); else comprobar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const clase = (id: string, elegido: string | null) => {
    if (!ronda.comprobado) return id === elegido ? s.answerChosen : s.answer;
    if (id === e.correcto) return s.answerRight;
    return id === elegido ? s.answerWrong : s.answer;
  };
  const ok = ronda.comprobado && ronda.aciertos[ronda.aciertos.length - 1];
  const p = byId[e.correcto];

  return (
    <div className={s.stack}>
      <div className={s.progress} aria-hidden="true"><div className={s.barFill} style={{ width: `${(100 * ronda.idx) / ronda.items.length}%` }} /></div>
      <div className={s.qMeta}><span>Prefijos de origen latino</span><span>{ronda.idx + 1} / {ronda.items.length}</span></div>
      <h2 ref={titulo} tabIndex={-1} className={s.palabra}>
        {ronda.comprobado ? <PalabraMarcada palabra={e.palabra} prefijoId={e.correcto} /> : e.palabra}
      </h2>

      <fieldset className={s.grupo}>
        <legend className={s.grupoTitulo}>1 · ¿Qué prefijo tiene?</legend>
        <div className={s.prefGrid}>
          {e.opcionesPrefijo.map((id, k) => (
            <button key={id} type="button" className={clase(id, ronda.prefijo)} disabled={ronda.comprobado} aria-pressed={ronda.prefijo === id} onClick={() => elegir('prefijo', id)}>
              <span className={s.letter}>{NUM[k]}</span><span>{byId[id].etiqueta}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.grupo}>
        <legend className={s.grupoTitulo}>2 · ¿Qué significa ese prefijo?</legend>
        <div className={s.answers}>
          {e.opcionesSignificado.map((id, k) => (
            <button key={id} type="button" className={clase(id, ronda.significado)} disabled={ronda.comprobado} aria-pressed={ronda.significado === id} onClick={() => elegir('significado', id)}>
              <span className={s.letter}>{LET[k]}</span><span>{byId[id].significado}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {ronda.comprobado && (
        <div className={`${s.card} ${ok ? s.feedback : s.feedbackBad}`} role="status">
          <p className={s.verdict} style={{ margin: 0, color: ok ? 'var(--ok)' : 'var(--bad)' }}>
            {ok ? '¡Correcto!' : ronda.prefijo === e.correcto ? 'Prefijo correcto, pero el significado no.' : ronda.significado === e.correcto ? 'Significado correcto, pero el prefijo no.' : 'Incorrecto.'}
          </p>
          <p style={{ marginBottom: 4 }}><strong>{p.etiqueta}</strong>: {p.significado}.</p>
          <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>Otras palabras: {p.ejemplos.filter((w) => w !== e.palabra).join(', ') || '—'}</p>
          <div className={s.fuente}>{LATIN.fuentePrefijos}, fila «{p.etiqueta}»</div>
        </div>
      )}

      <div className={s.row}>
        <button type="button" className={s.btn} onClick={salir}>Salir</button>
        <span className={s.spacer} />
        {ronda.comprobado
          ? <button type="button" className={s.btnPrimary} onClick={siguiente}>{ultima ? 'Ver resultado' : 'Siguiente'}</button>
          : <button type="button" className={s.btnPrimary} onClick={comprobar} disabled={!ronda.prefijo || !ronda.significado}>Comprobar</button>}
      </div>
    </div>
  );
}
