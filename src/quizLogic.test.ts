import { describe, expect, it } from 'vitest';
import { calcularResultado, crearSesion, esCorrecta, mejorPuntuacion, registrarRespuesta, type ItemSesion } from './quizLogic';
import type { Pregunta } from './types';

const q = (id: string, temaId: string, correcta: 0 | 1 | 2 | 3 = 0): Pregunta => ({
  id, temaId, correcta, enunciado: id, opciones: ['a', 'b', 'c', 'd'], explicacion: '', nivel: 'recordar', fuente: 'x',
});
// Identity order: displayed option k == original option k.
const item = (p: Pregunta): ItemSesion => ({ pregunta: p, orden: [0, 1, 2, 3] });

describe('calcularResultado', () => {
  it('counts score, per-topic % and wrong answers; unanswered counts as wrong', () => {
    const items = [item(q('1', 'A', 0)), item(q('2', 'A', 1)), item(q('3', 'B', 2)), item(q('4', 'B', 3))];
    const r = calcularResultado(items, [0, 3, 2, null]);
    expect(r.correctas).toBe(2);
    expect(r.total).toBe(4);
    expect(r.porcentaje).toBe(50);
    expect(r.porTema).toEqual({ A: { correctas: 1, total: 2 }, B: { correctas: 1, total: 2 } });
    expect(r.falladas.map((p) => p.id)).toEqual(['2', '4']);
  });

  it('maps displayed option back through the shuffled order', () => {
    const it: ItemSesion = { pregunta: q('1', 'A', 2), orden: [3, 2, 0, 1] }; // original #2 is shown at position 1
    expect(esCorrecta(it, 1)).toBe(true);
    expect(esCorrecta(it, 2)).toBe(false);
  });

  it('handles an empty session', () => {
    expect(calcularResultado([], []).porcentaje).toBe(0);
  });
});

describe('registrarRespuesta (repaso de errores)', () => {
  it('adds a question on a miss', () => {
    expect(registrarRespuesta({}, 'x', false)).toEqual({ x: 0 });
  });

  it('ignores a hit on a question not in the list', () => {
    expect(registrarRespuesta({}, 'x', true)).toEqual({});
  });

  it('removes a question after 2 consecutive hits', () => {
    let e = registrarRespuesta({}, 'x', false);
    e = registrarRespuesta(e, 'x', true);
    expect(e).toEqual({ x: 1 });
    e = registrarRespuesta(e, 'x', true);
    expect(e).toEqual({});
  });

  it('resets the streak on a miss between hits', () => {
    let e = registrarRespuesta({}, 'x', false);
    e = registrarRespuesta(e, 'x', true);
    e = registrarRespuesta(e, 'x', false);
    e = registrarRespuesta(e, 'x', true);
    expect(e).toEqual({ x: 1 });
  });

  it('does not mutate its input', () => {
    const e = { x: 1 };
    registrarRespuesta(e, 'x', true);
    expect(e).toEqual({ x: 1 });
  });
});

describe('crearSesion', () => {
  const pool = Array.from({ length: 10 }, (_, i) => q(String(i), 'A'));
  it('limits to N questions and keeps all with "todas"', () => {
    expect(crearSesion(pool, 3)).toHaveLength(3);
    expect(crearSesion(pool, 'todas')).toHaveLength(10);
    expect(crearSesion(pool, 30)).toHaveLength(10);
  });
  it('produces a permutation of the 4 options for each question', () => {
    for (const it of crearSesion(pool, 'todas')) expect([...it.orden].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('mejorPuntuacion', () => {
  it('returns null with no attempts, else best %', () => {
    expect(mejorPuntuacion([])).toBeNull();
    expect(mejorPuntuacion([
      { fecha: '', modo: 'examen', correctas: 5, total: 10 },
      { fecha: '', modo: 'practica', correctas: 9, total: 10 },
    ])).toBe(90);
  });
});
