# Estudio · Psicología, Economía, Latín, Filosofía y Arte

**▶ Apri la webapp: https://userman12.github.io/studio/**

Web app personale di studio (interfaccia e contenuti in spagnolo): **puntos clave**, **píldoras** (flashcard) e **quiz** per Psicología ed Economía, più **Latín**: Gramática (tabella dei prefissi, píldoras ed esercizio) ed Épica (teoria su Virgilio e la Eneida, píldoras e quiz di 30 domande). Più **Filosofía** (quiz di 40 domande) e **Arte** (commenti di 11 opere con foto). Nessun backend: tutto il progresso resta nel `localStorage` del browser.

Stack: Vite + React 18 + TypeScript, react-router (HashRouter), CSS Modules, Vitest.

## Avvio locale

```bash
npm install
npm run dev        # http://localhost:5173
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run validate` | valida `src/data/*.json` (schema, minimi, ID, `temaId`, `fuente`, distribuzione risposte, duplicati) |
| `npm test` | test della logica dei quiz (punteggio, lista errori, regola delle 2 risposte corrette) |
| `npm run build` | `validate` → controllo TypeScript → build in `dist/` |
| `npm run preview` | serve la build di `dist/` in locale |

La build fallisce se i contenuti non passano la validazione.

## Deploy statico

La build usa percorsi relativi (`base: './'`) e HashRouter (URL tipo `/#/economia/quiz`), quindi funziona su qualunque host statico, anche in una sottocartella, senza regole di rewrite.

- **Netlify**: build command `npm run build`, publish directory `dist`. In alternativa, trascina la cartella `dist/` su app.netlify.com/drop.
- **Vercel**: importa il repo; preset "Vite", build `npm run build`, output `dist`.
- **GitHub Pages**:
  ```bash
  npm run build
  npx gh-pages -d dist      # pubblica dist/ sul branch gh-pages
  ```
  Poi in *Settings → Pages* scegli il branch `gh-pages`. L'app sarà su `https://<utente>.github.io/studio/`.

## Aggiornare i contenuti

I contenuti stanno solo in `src/data/psicologia.json`, `src/data/economia.json` ed `src/data/epica.json` (stesso schema), separati dalla UI. Lo schema è in `src/types.ts`:

- `temas`: `{ id, titulo, orden }`
- `puntosClave`: `{ id, temaId, texto, fuente }`. In `texto` si può usare solo `**grassetto**`, che viene mostrato come evidenziatore.
- `pildoras`: `{ id, temaId, frente, reverso, fuente }`
- `preguntas`: `{ id, temaId, enunciado, opciones[4], correcta 0–3, explicacion, nivel, fuente }`

**Latín** (`src/data/latin.json`): `prefijos: { id, etiqueta, formas[], significado, ejemplos[] }`. Ogni esempio deve cominciare con una delle `formas` (lo controlla il validatore). `confundibles` elenca i gruppi di prefissi con significato simile, che non vengono mai proposti come distrattori l'uno dell'altro.

Regole:
1. Ogni elemento deve avere `fuente` (file + pagina + sezione) e un `temaId` esistente.
2. Gli ID devono essere unici e **stabili**: il progresso salvato è legato all'ID. Se cambi un ID, il progresso di quell'elemento si perde (gli ID orfani vengono ignorati).
3. Varia la posizione della risposta corretta: il validatore rifiuta una posizione sopra il 35%.
4. Dopo ogni modifica lancia `npm run validate`.

## Progresso e backup

- Il progresso è salvato per materia in `localStorage` (`estudio:v1:psicologia`, `estudio:v1:economia`, `estudio:v1:latin`, `estudio:v1:epica`).
- In **Progreso**, "Exportar progreso" scarica un JSON con tutte le materie e "Importar progreso" lo carica su un altro dispositivo, sostituendo le materie presenti nel file.
- "Reiniciar progreso" cancella solo la materia corrente, dopo una conferma.

## Struttura

```
src/
  data/*.json        contenuti
  types.ts           schema
  quizLogic.ts       logica pura dei quiz (+ quizLogic.test.ts)
  latinLogic.ts      esercizio sui prefissi (+ test su ogni parola)
  store.ts           localStorage, export/import
  App.tsx            routing, Home, layout materia
  Puntos.tsx  Pildoras.tsx  Quiz.tsx  Progreso.tsx  Latin.tsx
  Arte.tsx           pagina Arte (dati in src/data/arte.json)
public/arte/         foto delle opere (Wikimedia Commons, crediti in arte.json)
scripts/validate.mjs validatore dei contenuti
```
