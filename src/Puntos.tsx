import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Materia } from './types';
import { Md } from './App';
import s from './ui.module.css';

const EJEMPLOS: Record<Materia['id'], string> = {
  psicologia: 'Ej.: sinapsis, Gestalt, conductismo…',
  economia: 'Ej.: PYME, DAFO, sociedad anónima…',
  epica: 'Ej.: pietas, Dido, hexámetro…',
  latin: 'Ej.: sub-, encima de…',
};

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\*\*/g, '');

export function Puntos() {
  const m = useOutletContext<Materia>();
  const [q, setQ] = useState('');
  const term = plano(q.trim());

  const grupos = useMemo(() => [...m.temas].sort((a, b) => a.orden - b.orden).map((t) => ({
    tema: t,
    puntos: m.puntosClave.filter((p) => p.temaId === t.id && (!term || plano(p.texto).includes(term) || plano(t.titulo).includes(term))),
  })).filter((g) => g.puntos.length), [m, term]);

  return (
    <div className={s.stack}>
      <label className={s.field}>
        Buscar en {m.nombre}
        <input className={s.input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={EJEMPLOS[m.id]} />
      </label>
      {term && <p className={`${s.small} ${s.muted}`} aria-live="polite">{grupos.reduce((n, g) => n + g.puntos.length, 0)} puntos encontrados</p>}
      {grupos.length === 0 && <div className={s.empty}><p>Ningún punto clave contiene «{q}». Prueba con otra palabra.</p></div>}
      {grupos.map(({ tema, puntos }) => (
        // Searching opens every matching topic; otherwise topics start collapsed.
        <details key={tema.id + (term ? ':q' : '')} className={s.tema} open={!!term}>
          <summary className={s.temaSummary}>{tema.titulo}<span className={s.count}>{puntos.length}</span></summary>
          <ul className={s.points}>
            {puntos.map((p) => (
              <li key={p.id} className={s.point}>
                <Md text={p.texto} />
                <div className={s.fuente}>{p.fuente}</div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
