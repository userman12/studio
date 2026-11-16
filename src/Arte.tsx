import { useState } from 'react';
import arte from './data/arte.json';
import { Md } from './App';
import s from './ui.module.css';

type Obra = {
  id: string; numero: number; titulo: string; autor: string; fecha: string; estilo: string; texto: string; fuente: string;
  imagen: { src: string; alt: string; credito: string; licencia: string; url: string; ancho: number; alto: number };
};
export const OBRAS = arte.obras as Obra[];

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\*\*/g, '');

export function Arte() {
  const [q, setQ] = useState('');
  const t = plano(q.trim());
  const lista = OBRAS.filter((o) => !t || [o.titulo, o.autor, o.estilo, o.fecha, o.texto].some((x) => plano(x).includes(t)));

  return (
    <div className={s.arte}>
      <h1 className={s.pageTitle}><mark className={s.hl}>Arte</mark></h1>
      <p className={`${s.small} ${s.muted}`} style={{ margin: '0 0 14px' }}>Comentarios de {OBRAS.length} obras, de Grecia al Trecento.</p>
      <label className={s.field} style={{ marginBottom: 16 }}>
        Buscar obra, autor, estilo o concepto
        <input className={s.input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: contrapposto, gótico, Giotto…" />
      </label>
      {t && <p className={`${s.small} ${s.muted}`} aria-live="polite">{lista.length} obras encontradas</p>}
      {lista.length === 0 && <div className={s.empty}><p>Ninguna obra coincide con «{q}».</p></div>}
      <div className={s.stack}>
        {lista.map((o) => (
          <article key={o.id} className={s.obra} id={o.id}>
            <figure className={s.obraFig}>
              <img src={o.imagen.src} alt={o.imagen.alt} width={o.imagen.ancho} height={o.imagen.alto} loading="lazy" decoding="async" className={s.obraImg} />
              <figcaption className={s.credito}>
                Foto: {o.imagen.credito} · <a href={o.imagen.url} target="_blank" rel="noopener noreferrer">{o.imagen.licencia}</a>, Wikimedia Commons
              </figcaption>
            </figure>
            <div className={s.obraBody}>
              <h2 className={s.obraTitulo}><span className={s.obraNum}>{o.numero}</span>{o.titulo}</h2>
              <p className={s.ficha}>{o.autor} · {o.fecha} · {o.estilo}</p>
              <p className={s.obraTexto}><Md text={o.texto} /></p>
              <div className={s.fuente}>{o.fuente}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
