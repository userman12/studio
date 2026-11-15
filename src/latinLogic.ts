// Pure logic for the Latin prefix exercise.
import { shuffle } from './quizLogic';

export type Prefijo = { id: string; etiqueta: string; formas: string[]; significado: string; ejemplos: string[] };
export type DatosLatin = { id: 'latin'; nombre: string; fuentePrefijos: string; prefijos: Prefijo[]; confundibles: string[][] };

export type Ejercicio = {
  palabra: string;
  correcto: string; // prefijo id
  opcionesPrefijo: string[]; // 4 prefijo ids, shuffled
  opcionesSignificado: string[]; // 4 prefijo ids (their significado is shown), shuffled
};

export const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The form of `p` that the word starts with (longest match), or null. */
export function formaEn(p: Prefijo, palabra: string): string | null {
  const w = normalizar(palabra);
  return [...p.formas].sort((a, b) => b.length - a.length).find((f) => w.startsWith(normalizar(f))) ?? null;
}

export const todasLasPalabras = (d: DatosLatin) => d.prefijos.flatMap((p) => p.ejemplos.map((palabra) => ({ palabra, prefijoId: p.id })));

export function crearEjercicio(d: DatosLatin, palabra: string, prefijoId: string, rnd: () => number = Math.random): Ejercicio {
  const otros = d.prefijos.filter((p) => p.id !== prefijoId);
  const grupo = new Set(d.confundibles.filter((g) => g.includes(prefijoId)).flat());
  // A wrong prefix must not also fit the start of the word (e.g. "anti" for antifaz, "in" for intercostal).
  const prefDistr = otros.filter((p) => !formaEn(p, palabra));
  // A wrong meaning must not overlap the right one (e.g. pre- for antebrazo).
  const sigDistr = otros.filter((p) => !grupo.has(p.id));
  if (prefDistr.length < 3 || sigDistr.length < 3) throw new Error(`Sin distractores suficientes para «${palabra}»`);
  return {
    palabra,
    correcto: prefijoId,
    opcionesPrefijo: shuffle([prefijoId, ...shuffle(prefDistr, rnd).slice(0, 3).map((p) => p.id)], rnd),
    opcionesSignificado: shuffle([prefijoId, ...shuffle(sigDistr, rnd).slice(0, 3).map((p) => p.id)], rnd),
  };
}
