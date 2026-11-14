// Pure quiz logic (no React, no storage) so it can be unit-tested.
import type { Pregunta, Progreso } from './types';

/** Consecutive correct answers needed to leave the "repaso de errores" list. */
export const ACIERTOS_PARA_SALIR = 2;

export function shuffle<T>(arr: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A question as shown in a session: options in shuffled order, `orden[k]` = original index of displayed option k. */
export type ItemSesion = { pregunta: Pregunta; orden: number[] };

export function crearSesion(preguntas: readonly Pregunta[], n: number | 'todas', rnd: () => number = Math.random): ItemSesion[] {
  const elegidas = shuffle(preguntas, rnd).slice(0, n === 'todas' ? undefined : n);
  return elegidas.map((pregunta) => ({ pregunta, orden: shuffle([0, 1, 2, 3], rnd) }));
}

/** Whether displayed option `mostrada` is the right one. */
export const esCorrecta = (item: ItemSesion, mostrada: number) => item.orden[mostrada] === item.pregunta.correcta;

/** Apply one answer to the error list: a miss (re)enters it with 0 streak; a hit advances the streak and removes it at ACIERTOS_PARA_SALIR. */
export function registrarRespuesta(errores: Progreso['errores'], id: string, acierto: boolean): Progreso['errores'] {
  const next = { ...errores };
  if (!acierto) next[id] = 0;
  else if (id in next) {
    next[id] += 1;
    if (next[id] >= ACIERTOS_PARA_SALIR) delete next[id];
  }
  return next;
}

export type Resultado = {
  correctas: number;
  total: number;
  porcentaje: number;
  porTema: Record<string, { correctas: number; total: number }>;
  falladas: Pregunta[];
};

/** respuestas[i] = displayed option chosen for item i (null = unanswered, counts as wrong). */
export function calcularResultado(items: readonly ItemSesion[], respuestas: readonly (number | null)[]): Resultado {
  const porTema: Resultado['porTema'] = {};
  const falladas: Pregunta[] = [];
  let correctas = 0;
  items.forEach((item, i) => {
    const r = respuestas[i];
    const ok = r != null && esCorrecta(item, r);
    const t = (porTema[item.pregunta.temaId] ??= { correctas: 0, total: 0 });
    t.total++;
    if (ok) { t.correctas++; correctas++; } else falladas.push(item.pregunta);
  });
  const total = items.length;
  return { correctas, total, porcentaje: total ? Math.round((100 * correctas) / total) : 0, porTema, falladas };
}

export function mejorPuntuacion(historial: Progreso['historial']): number | null {
  if (!historial.length) return null;
  return Math.max(...historial.map((h) => (h.total ? Math.round((100 * h.correctas) / h.total) : 0)));
}
