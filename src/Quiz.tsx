import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Materia, Modo } from './types';
import { useProgreso } from './store';
import { calcularResultado, crearSesion, esCorrecta, registrarRespuesta, type ItemSesion, type Resultado } from './quizLogic';
import s from './ui.module.css';

const LETRAS = 'ABCD';
const MODOS: { id: Modo; titulo: string; desc: string }[] = [
  { id: 'practica', titulo: 'Práctica', desc: 'Corrección y explicación después de cada pregunta.' },
  { id: 'examen', titulo: 'Examen', desc: 'Preguntas al azar; la corrección llega al final.' },
  { id: 'repaso', titulo: 'Repaso de errores', desc: 'Solo las que fallaste. Salen tras 2 aciertos seguidos.' },
];
const TAMANOS = [10, 20, 30, 'todas'] as const;

type Sesion = { modo: Modo; items: ItemSesion[]; respuestas: (number | null)[]; idx: number; corregida: boolean };

export function Quiz() {
  const m = useOutletContext<Materia>();
  const [prog, update] = useProgreso(m.id);
  const [modo, setModo] = useState<Modo>('practica');
  const [temaId, setTemaId] = useState('');
  const [n, setN] = useState<(typeof TAMANOS)[number]>(10);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const pool = useMemo(() => m.preguntas.filter((q) => (!temaId || q.temaId === temaId) && (modo !== 'repaso' || q.id in prog.errores)), [m, temaId, modo, prog.errores]);
  const temaTitulo = (id: string) => m.temas.find((t) => t.id === id)?.titulo ?? id;

  const empezar = () => {
    if (!pool.length) return setResultado(null);
    setResultado(null);
    const items = crearSesion(pool, modo === 'examen' ? n : 'todas');
    setSesion({ modo, items, respuestas: items.map(() => null), idx: 0, corregida: false });
  };

  const terminar = (ses: Sesion) => {
    const r = calcularResultado(ses.items, ses.respuestas);
    update((prev) => {
      let errores = prev.errores;
      // Práctica/repaso already recorded each answer as it was given; the exam records them all now.
      if (ses.modo === 'examen') ses.items.forEach((it, i) => { errores = registrarRespuesta(errores, it.pregunta.id, ses.respuestas[i] != null && esCorrecta(it, ses.respuestas[i]!)); });
      return { ...prev, errores, historial: [...prev.historial, { fecha: new Date().toISOString(), modo: ses.modo, correctas: r.correctas, total: r.total }] };
    });
    setResultado(r);
    setSesion(null);
  };

  if (sesion) return <Pregunta key={sesion.idx} sesion={sesion} temaTitulo={temaTitulo}
    onResponder={(k) => {
      const it = sesion.items[sesion.idx];
      if (sesion.modo === 'examen') {
        setSesion({ ...sesion, respuestas: sesion.respuestas.map((r, i) => (i === sesion.idx ? k : r)) });
      } else if (!sesion.corregida) {
        update((prev) => ({ ...prev, errores: registrarRespuesta(prev.errores, it.pregunta.id, esCorrecta(it, k)) }));
        setSesion({ ...sesion, respuestas: sesion.respuestas.map((r, i) => (i === sesion.idx ? k : r)), corregida: true });
      }
    }}
    onSiguiente={() => {
      if (sesion.idx === sesion.items.length - 1) terminar(sesion);
      else setSesion({ ...sesion, idx: sesion.idx + 1, corregida: false });
    }}
    onSalir={() => { if (confirm('¿Salir del quiz? Este intento no se guardará en el historial.')) setSesion(null); }}
  />;

  if (resultado) return <Final r={resultado} temaTitulo={temaTitulo} puedeRepetir={pool.length > 0} onOtra={empezar} onVolver={() => setResultado(null)} />;

  return (
    <div className={s.stack}>
      <fieldset className={s.segmented} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}>Modo</legend>
        {MODOS.map((x) => (
          <button key={x.id} type="button" className={modo === x.id ? s.optionOn : s.option} aria-pressed={modo === x.id} onClick={() => setModo(x.id)}>
            <strong>{x.titulo}</strong><span className={`${s.small} ${s.muted}`}>{x.desc}</span>
          </button>
        ))}
      </fieldset>
      <div className={s.row}>
        <label className={s.field}>
          Tema
          <select className={s.select} value={temaId} onChange={(e) => setTemaId(e.target.value)}>
            <option value="">Todos los temas</option>
            {m.temas.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        </label>
        {modo === 'examen' && (
          <label className={s.field}>
            Número de preguntas
            <select className={s.select} value={String(n)} onChange={(e) => setN(e.target.value === 'todas' ? 'todas' : (Number(e.target.value) as 10 | 20 | 30))}>
              {TAMANOS.map((t) => <option key={t} value={String(t)}>{t === 'todas' ? `Todas (${pool.length})` : t}</option>)}
            </select>
          </label>
        )}
      </div>
      {pool.length === 0 ? (
        <div className={s.empty}>
          <p>{modo === 'repaso' ? 'No tienes preguntas falladas pendientes en este tema. ¡Bien!' : 'No hay preguntas para este tema.'}</p>
          {modo === 'repaso' && <button type="button" className={s.btn} onClick={() => setModo('practica')}>Hacer práctica</button>}
        </div>
      ) : (
        <button type="button" className={s.btnPrimary} onClick={empezar}>
          Empezar · {modo === 'examen' && n !== 'todas' ? Math.min(n, pool.length) : pool.length} preguntas
        </button>
      )}
      <p className={`${s.small} ${s.muted}`}>Teclado: <span className={s.kbd}>1</span>–<span className={s.kbd}>4</span> o <span className={s.kbd}>A</span>–<span className={s.kbd}>D</span> para responder, <span className={s.kbd}>Enter</span> para continuar.</p>
    </div>
  );
}

function Pregunta({ sesion, temaTitulo, onResponder, onSiguiente, onSalir }: {
  sesion: Sesion; temaTitulo: (id: string) => string;
  onResponder: (k: number) => void; onSiguiente: () => void; onSalir: () => void;
}) {
  const it = sesion.items[sesion.idx];
  const elegida = sesion.respuestas[sesion.idx];
  const examen = sesion.modo === 'examen';
  const ultima = sesion.idx === sesion.items.length - 1;
  const puedeSeguir = examen ? elegida != null : sesion.corregida;
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => { titulo.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (k >= 0 && e.key.length === 1) { e.preventDefault(); onResponder(k); }
      else if (e.key === 'Enter' && puedeSeguir && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); onSiguiente(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const clase = (k: number) => {
    if (examen || !sesion.corregida) return k === elegida ? s.answerChosen : s.answer;
    if (it.orden[k] === it.pregunta.correcta) return s.answerRight;
    return k === elegida ? s.answerWrong : s.answer;
  };
  const acierto = elegida != null && esCorrecta(it, elegida);
  const correctaMostrada = it.orden.indexOf(it.pregunta.correcta);

  return (
    <div className={s.stack}>
      <div className={s.progress} aria-hidden="true"><div className={s.barFill} style={{ width: `${(100 * sesion.idx) / sesion.items.length}%` }} /></div>
      <div className={s.qMeta}>
        <span>{MODOS.find((x) => x.id === sesion.modo)?.titulo} · {temaTitulo(it.pregunta.temaId)}</span>
        <span>{sesion.idx + 1} / {sesion.items.length}</span>
      </div>
      <h2 ref={titulo} tabIndex={-1} className={s.qText}>{it.pregunta.enunciado}</h2>
      <ul className={s.answers} aria-label="Opciones">
        {it.orden.map((orig, k) => (
          <li key={k}>
            <button type="button" className={clase(k)} disabled={!examen && sesion.corregida} aria-pressed={k === elegida} onClick={() => onResponder(k)}>
              <span className={s.letter}>{LETRAS[k]}</span><span>{it.pregunta.opciones[orig]}</span>
            </button>
          </li>
        ))}
      </ul>
      {!examen && sesion.corregida && (
        <div className={`${s.card} ${acierto ? s.feedback : s.feedbackBad}`} role="status">
          <p className={s.verdict} style={{ margin: 0, color: acierto ? 'var(--ok)' : 'var(--bad)' }}>
            {acierto ? '¡Correcto!' : `Incorrecto. La respuesta correcta es la ${LETRAS[correctaMostrada]}.`}
          </p>
          <p>{it.pregunta.explicacion}</p>
          <div className={s.fuente}>{it.pregunta.fuente}</div>
        </div>
      )}
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={onSalir}>Salir</button>
        <span className={s.spacer} />
        <button type="button" className={s.btnPrimary} disabled={!puedeSeguir} onClick={onSiguiente}>
          {ultima ? (examen ? 'Terminar examen' : 'Ver resultado') : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

function Final({ r, temaTitulo, puedeRepetir, onOtra, onVolver }: { r: Resultado; temaTitulo: (id: string) => string; puedeRepetir: boolean; onOtra: () => void; onVolver: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <h2 ref={titulo} tabIndex={-1} className={s.small} style={{ outline: 'none', fontFamily: 'var(--font-body)', fontWeight: 400, color: 'var(--muted)' }}>Resultado</h2>
        <div className={s.score}>{r.porcentaje}%</div>
        <p style={{ margin: '6px 0 0' }}>{r.correctas} de {r.total} correctas</p>
      </div>
      <div className={s.card}>
        <h3 style={{ marginBottom: 12 }}>Por tema</h3>
        <div className={s.stack}>
          {Object.entries(r.porTema).map(([id, t]) => {
            const pct = Math.round((100 * t.correctas) / t.total);
            return (
              <div key={id} className={s.temaBar}>
                <span>{temaTitulo(id)}</span><span className={s.small}>{t.correctas}/{t.total} · {pct}%</span>
                <div className={s.bar} style={{ gridColumn: '1 / -1' }}><div className={s.barFill} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
      {r.falladas.length > 0 && (
        <div className={s.card}>
          <h3 style={{ marginBottom: 4 }}>Preguntas falladas</h3>
          <p className={`${s.small} ${s.muted}`} style={{ marginTop: 0 }}>Ya están en «Repaso de errores».</p>
          <ol className={s.stack} style={{ paddingLeft: 20, margin: 0 }}>
            {r.falladas.map((q) => (
              <li key={q.id}>
                <strong>{q.enunciado}</strong>
                <div>Respuesta correcta: <mark className={s.hl}>{q.opciones[q.correcta]}</mark></div>
                <div className={s.muted}>{q.explicacion}</div>
                <div className={s.fuente}>{q.fuente}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={onVolver}>Cambiar modo</button>
        <Link to="../progreso" relative="path" className={s.btn}>Ver historial</Link>
        <span className={s.spacer} />
        <button type="button" className={s.btnPrimary} onClick={onOtra} disabled={!puedeRepetir}>Otra vez</button>
      </div>
    </div>
  );
}
