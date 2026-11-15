import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Materia, Modo } from './types';
import { exportar, importar, useProgreso, vacio } from './store';
import { resumen } from './App';
import s from './ui.module.css';

const NOMBRE_MODO: Record<Modo, string> = { practica: 'Práctica', examen: 'Examen', repaso: 'Repaso de errores' };

export function Progreso() {
  const m = useOutletContext<Materia>();
  const [prog, update] = useProgreso(m.id);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const r = resumen(m);

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([exportar()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `estudio-progreso-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ ok: true, text: 'Progreso exportado.' });
  };

  const cargar = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm('Importar sustituirá el progreso actual de las materias incluidas en el archivo. ¿Continuar?')) return;
    const err = importar(await f.text());
    if (err) setMsg({ ok: false, text: err });
    else { location.reload(); }
  };

  const reiniciar = () => {
    if (!confirm(`¿Borrar todo el progreso de ${m.nombre}? Se perderán píldoras marcadas, errores e historial. No se puede deshacer.`)) return;
    update(() => vacio());
    setMsg({ ok: true, text: `Progreso de ${m.nombre} reiniciado.` });
  };

  const historial = [...prog.historial].reverse();

  return (
    <div className={s.stack}>
      <div className={`${s.card} ${s.stats}`}>
        <div className={s.stat}><span className={s.statNum}>{r.sabidas}/{m.pildoras.length}</span><span className={s.statLabel}>píldoras que sabes ({r.pctPildoras}%)</span></div>
        <div className={s.stat}><span className={s.statNum}>{r.mejor == null ? '—' : `${r.mejor}%`}</span><span className={s.statLabel}>mejor puntuación</span></div>
        <div className={s.stat}><span className={s.statNum}>{r.errores}</span><span className={s.statLabel}>preguntas por repasar</span></div>
      </div>

      <div className={s.card}>
        <h3 style={{ marginBottom: 8 }}>Historial de quiz</h3>
        {historial.length === 0 ? <p className={s.muted}>Aún no has terminado ningún quiz de {m.nombre}.</p> : (
          <table className={s.table}>
            <thead><tr><th>Fecha</th><th>Modo</th><th>Puntuación</th></tr></thead>
            <tbody>
              {historial.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{NOMBRE_MODO[h.modo]}</td>
                  <td>{h.correctas}/{h.total} · {h.total ? Math.round((100 * h.correctas) / h.total) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`${s.card} ${s.stack}`}>
        <h3>Copia de seguridad</h3>
        <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>Exporta el progreso de todas las materias a un archivo JSON e impórtalo en otro dispositivo.</p>
        <div className={s.row}>
          <button type="button" className={s.btn} onClick={descargar}>Exportar progreso</button>
          <button type="button" className={s.btn} onClick={() => file.current?.click()}>Importar progreso</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      <div className={`${s.card} ${s.stack}`}>
        <h3>Reiniciar</h3>
        <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>Borra solo el progreso de {m.nombre}.</p>
        <div><button type="button" className={s.btnDanger} onClick={reiniciar}>Reiniciar progreso de {m.nombre}</button></div>
      </div>

      {msg && <p role="status" style={{ color: msg.ok ? 'var(--ok)' : 'var(--bad)' }}>{msg.text}</p>}
    </div>
  );
}
