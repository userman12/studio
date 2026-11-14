import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Materia } from './types';
import { useProgreso } from './store';
import { shuffle } from './quizLogic';
import s from './ui.module.css';

export function Pildoras() {
  const m = useOutletContext<Materia>();
  const [prog, update] = useProgreso(m.id);
  const [temaId, setTemaId] = useState('');
  const [soloRepasar, setSoloRepasar] = useState(false);
  const [aleatorio, setAleatorio] = useState(false);
  const [semilla, setSemilla] = useState(0);
  const [i, setI] = useState(0);
  const [girada, setGirada] = useState(false);

  // The deck is a snapshot taken when filters change, so marking a card doesn't make it vanish mid-session.
  const mazo = useMemo(() => {
    const base = m.pildoras.filter((p) => (!temaId || p.temaId === temaId) && (!soloRepasar || prog.pildoras[p.id] === 'repasar'));
    return aleatorio ? shuffle(base) : base;
  }, [m, temaId, soloRepasar, aleatorio, semilla]); // prog deliberately omitted (snapshot)

  useEffect(() => { setI(0); setGirada(false); }, [mazo]);

  const ir = (d: number) => { setGirada(false); setI((x) => Math.min(Math.max(x + d, 0), mazo.length - 1)); };
  const marcar = (estado: 'se' | 'repasar') => {
    const p = mazo[i];
    update((prev) => ({ ...prev, pildoras: { ...prev.pildoras, [p.id]: estado } }));
    if (i < mazo.length - 1) ir(1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sabidas = m.pildoras.filter((p) => prog.pildoras[p.id] === 'se').length;
  const p = mazo[i];
  const estado = p && prog.pildoras[p.id];
  const tema = p && m.temas.find((t) => t.id === p.temaId);

  return (
    <div className={s.stack}>
      <div className={s.row}>
        <label className={s.field}>
          Tema
          <select className={s.select} value={temaId} onChange={(e) => setTemaId(e.target.value)}>
            <option value="">Todos los temas</option>
            {m.temas.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        </label>
        <label className={s.check}><input type="checkbox" checked={soloRepasar} onChange={(e) => setSoloRepasar(e.target.checked)} /> Solo «Repasar»</label>
        <label className={s.check}><input type="checkbox" checked={aleatorio} onChange={(e) => setAleatorio(e.target.checked)} /> Orden aleatorio</label>
        {aleatorio && <button type="button" className={s.iconBtn} onClick={() => setSemilla((x) => x + 1)}>Barajar otra vez</button>}
      </div>
      <p className={`${s.small} ${s.muted}`}>Sabes {sabidas} de {m.pildoras.length} píldoras.</p>

      {!p ? (
        <div className={s.empty}>
          <p>{soloRepasar ? 'No tienes píldoras marcadas para repasar con este filtro.' : 'No hay píldoras para este filtro.'}</p>
          {soloRepasar && <button type="button" className={s.btn} onClick={() => setSoloRepasar(false)}>Ver todas</button>}
        </div>
      ) : (
        <>
          <div className={s.qMeta}>
            <span>{tema?.titulo}</span>
            <span>{i + 1} / {mazo.length}</span>
          </div>
          <div className={s.flipWrap}>
            <button
              type="button"
              className={`${s.flip} ${girada ? s.flipped : ''}`}
              onClick={() => setGirada((g) => !g)}
              aria-label={girada ? `Respuesta: ${p.reverso}. Pulsa para volver a la pregunta.` : `${p.frente}. Pulsa para ver la respuesta.`}
            >
              <span className={s.face} aria-hidden="true">
                <span className={s.faceLabel}>Concepto</span>
                <span className={s.faceFront}>{p.frente}</span>
                <span className={`${s.small} ${s.muted}`}>Toca para ver la respuesta</span>
              </span>
              <span className={`${s.face} ${s.back}`} aria-hidden="true">
                <span className={s.faceLabel}>Respuesta</span>
                <span className={s.faceBack}>{p.reverso}</span>
                <span className={s.fuente}>{p.fuente}</span>
              </span>
            </button>
          </div>
          <div className={s.row}>
            {estado === 'se' && <span className={s.badgeSe}>Lo sabes</span>}
            {estado === 'repasar' && <span className={s.badgeRep}>Para repasar</span>}
          </div>
          <div className={s.cardActions}>
            <button type="button" className={s.btn} onClick={() => marcar('repasar')}>Repasar</button>
            <button type="button" className={s.btnPrimary} onClick={() => marcar('se')}>Lo sé</button>
          </div>
          <div className={s.cardActions}>
            <button type="button" className={s.iconBtn} onClick={() => ir(-1)} disabled={i === 0}>← Anterior</button>
            <button type="button" className={s.iconBtn} onClick={() => ir(1)} disabled={i === mazo.length - 1}>Siguiente →</button>
          </div>
        </>
      )}
    </div>
  );
}
