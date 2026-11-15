// npm run validate — checks src/data/*.json against the content rules. Exits 1 on any error.
import fs from 'node:fs';

const FILES = ['psicologia', 'economia', 'epica'];
const MIN_PIL = { psicologia: 40, economia: 40, epica: 30 };
const MIN_PREGUNTAS = 30, MAX_POS_SHARE = 0.35, DUP_THRESHOLD = 0.8;
const NIVELES = ['recordar', 'comprender', 'aplicar'];
const BANNED = ['todas las anteriores', 'ninguna de las anteriores'];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

let failed = false;
for (const name of FILES) {
  const errors = [];
  const err = (m) => errors.push(m);
  let m;
  try { m = JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8')); }
  catch (e) { console.error(`✗ ${name}: JSON inválido — ${e.message}`); failed = true; continue; }

  // Schema
  if (m.id !== name) err(`id debe ser "${name}"`);
  if (!isStr(m.nombre)) err('nombre vacío');
  for (const k of ['temas', 'puntosClave', 'pildoras', 'preguntas']) if (!Array.isArray(m[k])) err(`${k} no es un array`);
  if (errors.length) { report(name, errors); continue; }

  const ids = new Set();
  const checkId = (x, where) => {
    if (!isStr(x.id)) return err(`${where}: id vacío`);
    if (ids.has(x.id)) err(`id duplicado: ${x.id}`);
    ids.add(x.id);
  };
  m.temas.forEach((t) => { checkId(t, 'tema'); if (!isStr(t.titulo)) err(`${t.id}: titulo vacío`); if (typeof t.orden !== 'number') err(`${t.id}: orden no numérico`); });
  const temaIds = new Set(m.temas.map((t) => t.id));
  const used = new Set();
  const common = (x, kind, fields) => {
    checkId(x, kind);
    if (!temaIds.has(x.temaId)) err(`${x.id}: temaId inexistente "${x.temaId}"`);
    used.add(x.temaId);
    if (!isStr(x.fuente)) err(`${x.id}: fuente vacía`);
    for (const f of fields) if (!isStr(x[f])) err(`${x.id}: ${f} vacío`);
  };
  m.puntosClave.forEach((p) => {
    common(p, 'puntoClave', ['texto']);
    if (((p.texto || '').match(/\*\*/g) || []).length % 2) err(`${p.id}: negrita (**) sin cerrar`);
    if (/(^|[^*])\*(?!\*)/.test((p.texto || '').replace(/\*\*/g, ''))) err(`${p.id}: asterisco suelto (solo se admite **negrita**)`);
  });
  m.pildoras.forEach((p) => common(p, 'pildora', ['frente', 'reverso']));
  m.preguntas.forEach((q) => {
    common(q, 'pregunta', ['enunciado', 'explicacion']);
    if (!Array.isArray(q.opciones) || q.opciones.length !== 4 || !q.opciones.every(isStr)) err(`${q.id}: necesita exactamente 4 opciones no vacías`);
    else {
      if (new Set(q.opciones.map((o) => o.trim().toLowerCase())).size !== 4) err(`${q.id}: opciones repetidas`);
      if (q.opciones.some((o) => BANNED.some((b) => o.toLowerCase().includes(b)))) err(`${q.id}: opción prohibida ("todas/ninguna de las anteriores")`);
    }
    if (![0, 1, 2, 3].includes(q.correcta)) err(`${q.id}: correcta debe ser 0–3`);
    if (!NIVELES.includes(q.nivel)) err(`${q.id}: nivel inválido "${q.nivel}"`);
  });
  m.temas.forEach((t) => { if (!used.has(t.id)) err(`tema sin contenido: ${t.id}`); });

  // Minimums
  if (m.preguntas.length < MIN_PREGUNTAS) err(`solo ${m.preguntas.length} preguntas (mínimo ${MIN_PREGUNTAS})`);
  if (m.pildoras.length < MIN_PIL[name]) err(`solo ${m.pildoras.length} píldoras (mínimo ${MIN_PIL[name]})`);

  // Correct-answer position distribution
  const pos = [0, 0, 0, 0];
  m.preguntas.forEach((q) => { if (pos[q.correcta] !== undefined) pos[q.correcta]++; });
  pos.forEach((c, i) => { if (c / m.preguntas.length > MAX_POS_SHARE) err(`posición ${'ABCD'[i]} correcta en ${(100 * c / m.preguntas.length).toFixed(0)}% (> 35%)`); });

  // Near-duplicate enunciados — ponytail: O(n²) pairwise scan, fine for a few hundred questions.
  const toks = m.preguntas.map((q) => norm(q.enunciado));
  for (let i = 0; i < toks.length; i++) for (let j = i + 1; j < toks.length; j++) {
    const s = jaccard(toks[i], toks[j]);
    if (s >= DUP_THRESHOLD) err(`enunciados casi duplicados (${(s * 100).toFixed(0)}%): ${m.preguntas[i].id} / ${m.preguntas[j].id}`);
  }

  report(name, errors, `${m.temas.length} temas, ${m.puntosClave.length} puntos clave, ${m.pildoras.length} píldoras, ${m.preguntas.length} preguntas; posiciones A/B/C/D = ${pos.join('/')}`);
}

// ---- latin.json (prefix table) ----
{
  const errors = [];
  const err = (m) => errors.push(m);
  const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  try {
    const d = JSON.parse(fs.readFileSync(new URL('../src/data/latin.json', import.meta.url), 'utf8'));
    if (!isStr(d.fuentePrefijos)) err('fuentePrefijos vacía');
    const ids = new Set(), palabras = new Set();
    for (const p of d.prefijos ?? []) {
      if (!isStr(p.id) || ids.has(p.id)) err(`prefijo id vacío o duplicado: ${p.id}`);
      ids.add(p.id);
      for (const f of ['etiqueta', 'significado']) if (!isStr(p[f])) err(`${p.id}: ${f} vacío`);
      if (!Array.isArray(p.formas) || !p.formas.length) err(`${p.id}: sin formas`);
      if (!Array.isArray(p.ejemplos) || !p.ejemplos.length) err(`${p.id}: sin ejemplos`);
      for (const w of p.ejemplos ?? []) {
        if (palabras.has(plain(w))) err(`palabra repetida: ${w}`);
        palabras.add(plain(w));
        if (!p.formas.some((f) => plain(w).startsWith(plain(f)))) err(`${w}: no empieza por ${p.formas.join('/')}`);
      }
    }
    for (const g of d.confundibles ?? []) for (const id of g) if (!ids.has(id)) err(`confundibles: id inexistente ${id}`);
    report('latin', errors, `${ids.size} prefijos, ${palabras.size} palabras de ejemplo`);
  } catch (e) { report('latin', [`JSON inválido — ${e.message}`]); }
}

function report(name, errors, summary = '') {
  if (errors.length) { failed = true; console.error(`✗ ${name}: ${errors.length} error(es)`); errors.forEach((e) => console.error('   - ' + e)); }
  else console.log(`✓ ${name}: ${summary}`);
}
process.exit(failed ? 1 : 0);
