import { describe, expect, it } from 'vitest';
import latin from './data/latin.json';
import { crearEjercicio, formaEn, todasLasPalabras, type DatosLatin } from './latinLogic';

const d = latin as DatosLatin;
const byId = Object.fromEntries(d.prefijos.map((p) => [p.id, p]));

describe('formaEn', () => {
  it('finds the longest matching form, ignoring accents', () => {
    expect(formaEn(byId.trans, 'trashumancia')).toBe('tras');
    expect(formaEn(byId.circun, 'circumpolar')).toBe('circum');
    expect(formaEn(byId.in, 'ilegalizar')).toBe('i');
    expect(formaEn(byId.in, 'inacción')).toBe('in');
    expect(formaEn(byId.pre, 'antebrazo')).toBeNull();
  });
});

describe('crearEjercicio — for every word in the table', () => {
  for (const { palabra, prefijoId } of todasLasPalabras(d)) {
    it(palabra, () => {
      for (let seed = 0; seed < 5; seed++) {
        const e = crearEjercicio(d, palabra, prefijoId);
        expect(new Set(e.opcionesPrefijo).size).toBe(4);
        expect(new Set(e.opcionesSignificado).size).toBe(4);
        expect(e.opcionesPrefijo).toContain(prefijoId);
        expect(e.opcionesSignificado).toContain(prefijoId);
        // no ambiguous prefix distractor
        for (const id of e.opcionesPrefijo) if (id !== prefijoId) expect(formaEn(byId[id], palabra)).toBeNull();
        // no overlapping meaning distractor
        const grupo = d.confundibles.filter((g) => g.includes(prefijoId)).flat();
        for (const id of e.opcionesSignificado) if (id !== prefijoId) expect(grupo).not.toContain(id);
      }
    });
  }

  it('antifaz never offers anti- as a wrong prefix', () => {
    for (let i = 0; i < 30; i++) expect(crearEjercicio(d, 'antifaz', 'ante').opcionesPrefijo).not.toContain('anti');
  });
});
