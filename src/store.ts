// Progress persistence in localStorage. Every access is guarded: private mode or blocked storage must not break the app.
import { useCallback, useEffect, useState } from 'react';
import type { MateriaId, Progreso } from './types';

/** Every saved progress slot. Latín reuses Progreso: `errores` is keyed by word, `pildoras` stays empty. */
export type ProgresoId = MateriaId | 'latin';

const KEY = (m: ProgresoId) => `estudio:v1:${m}`;
export const vacio = (): Progreso => ({ pildoras: {}, errores: {}, historial: [] });

const esProgreso = (x: unknown): x is Progreso => {
  const p = x as Progreso;
  return !!p && typeof p === 'object' && typeof p.pildoras === 'object' && typeof p.errores === 'object' && Array.isArray(p.historial);
};

export function leer(m: ProgresoId): Progreso {
  try {
    const raw = localStorage.getItem(KEY(m));
    const p = raw ? JSON.parse(raw) : null;
    return esProgreso(p) ? p : vacio();
  } catch {
    return vacio();
  }
}

export function guardar(m: ProgresoId, p: Progreso): boolean {
  try {
    localStorage.setItem(KEY(m), JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

/** React hook: current progress for a subject + an updater that persists immediately. */
export function useProgreso(m: ProgresoId) {
  const [p, setP] = useState<Progreso>(() => leer(m));
  useEffect(() => setP(leer(m)), [m]);
  const update = useCallback((fn: (prev: Progreso) => Progreso) => {
    setP((prev) => {
      const next = fn(prev);
      guardar(m, next);
      return next;
    });
  }, [m]);
  return [p, update] as const;
}

const MATERIAS: ProgresoId[] = ['psicologia', 'economia', 'latin'];

export function exportar(): string {
  return JSON.stringify({ app: 'estudio', version: 1, fecha: new Date().toISOString(), progreso: Object.fromEntries(MATERIAS.map((m) => [m, leer(m)])) }, null, 2);
}

/** Returns an error message, or null on success. Only overwrites subjects present and well-formed in the file. */
export function importar(texto: string): string | null {
  let data: { app?: string; progreso?: Record<string, unknown> };
  try { data = JSON.parse(texto); } catch { return 'El archivo no es un JSON válido.'; }
  if (data?.app !== 'estudio' || !data.progreso) return 'El archivo no es una exportación de esta aplicación.';
  const validas = MATERIAS.filter((m) => esProgreso(data.progreso![m]));
  if (!validas.length) return 'El archivo no contiene progreso válido.';
  for (const m of validas) if (!guardar(m, data.progreso![m] as Progreso)) return 'No se pudo guardar (almacenamiento del navegador no disponible).';
  return null;
}
