# Guida al repository

Questo documento è il contesto essenziale per persone e assistenti AI. Mantenerlo breve e aggiornato quando cambiano struttura, flussi dati o convenzioni.

## Scopo e stack

Poliplanner è un planner locale e self-hostable per studenti PoliMi: lezioni, materie, piano di studi (codice 531) ed esami. Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4 e SQLite con `better-sqlite3`. Package manager: pnpm.

## Mappa rapida

```text
src/app/                 routing e Server Actions
  (app)/                 pagine che condividono AppNav
  actions.ts             unico punto delle mutazioni dal client
src/features/            componenti per dominio e interattività client
src/components/          UI riusabile e navigazione
src/lib/                 dominio, query SQLite e tipi
  db.ts                  singleton SQLite; file db/lesson_tracker.db
  schema.ts              schema idempotente e migrazioni leggere
  schedule.ts            regole ricorrenti -> occorrenze concrete
  dashboard.ts           query dashboard e stato lezioni
  piano.ts, esami.ts     persistenza piano annuale/carriera
  pianoPage.ts           read model coordinato della pagina /piano
  pianoApply.ts          applica uno scenario simulato in una transazione
  polimi/                dominio PoliMi, tutto puro tranne dove indicato
    catalog/             catalogo + regole versionati per anno accademico
    academicYear.ts      aritmetica AA e anno "da pianificare"
    planModel.ts         forma del piano annuale, senza persistenza
    career.ts            carriera: frequenza acquisita vs esame verbalizzato
    frequency.ts         frequenze già acquisite (piani precedenti + esiti d'esame)
    structuralChoice.ts  stati delle scelte obbligate condizionate
    annualPlan.ts        reinserimenti, proposta annuale, totali CFU
    rules.ts             motore delle regole dichiarative
    validation.ts        validatore del piano annuale
    courseAdvice.ts      spiegazioni in linguaggio semplice per la scelta dei corsi
    simulator.ts         scenari non distruttivi
src/scripts/             utility eseguibili con tsx
public/                  manifest e service worker PWA
```

## Architettura e flussi

- Le pagine sono Server Components e leggono direttamente da `src/lib/*`: non esiste una REST API per le letture. Dove servono più letture correlate, il coordinatore sta in un read model (`lib/pianoPage.ts`) invece di ripetere query nella pagina.
- La pagina `/piano` carica al primo render solo testata, azioni richieste, piano proposto e pannello laterale. Simulatore, modale del catalogo, guida, storico, dettaglio delle regole e anteprima degli anni successivi passano da `features/piano/lazyPanels.ts` (`next/dynamic`, `ssr: false`). Non importare `motion/react` in quel percorso: le aperture usano `.animate-panel-open` in `globals.css`.
- I componenti interattivi usano `"use client"` e invocano solo funzioni esportate da `src/app/actions.ts` per scrivere. Ogni mutazione invalida **solo i percorsi che leggono davvero quel dato**, usando i gruppi `PLAN_PATHS`/`CAREER_PATHS`/`SCHEDULE_PATHS`/`EVERYTHING` in `actions.ts`: non usare `revalidatePath("/", "layout")`, che butta via anche le rotte statiche. Quando l'azione può restituire il dato aggiornato, restituiscilo e aggiorna lo stato locale invece di aggiungere un `router.refresh()`.
- `schedule` conserva un ID stabile; `lesson_occurrence` è la vista materializzata legata da `schedule_id`, con `mode_override`. `saveSchedule()` aggiorna regole e occorrenze nella stessa transazione, preservando `done` per date/regole invariate.
- SQLite è locale, in WAL mode, con foreign key, timeout e schema v2 versionato da `PRAGMA user_version`. `POLIPLANNER_DB_PATH` è l'override facoltativo; un upgrade legacy fa prima un backup coerente. Non introdurre ORM o migrazioni esterne senza una necessità concreta.
- Il piano ha scenari (`study_plan_cycles`) e righe (`study_plan_entries`). Stato e archiviazione sono distinti; `settings.active_plan_cycle_id` determina il solo scenario usato da dashboard/esami. Gli scenari compilati sono immutabili. Il validatore deve restare puro in `lib/polimi/validation.ts` e i suoi test vivono in `src/scripts/test-polimi-plan.ts`.
- **Un piano è un anno accademico**, non la laurea: prima i reinserimenti (frequenza già acquisita e esame non verbalizzato), poi le nuove frequenze. Solo le nuove frequenze contano per la contribuzione. I 180 CFU sono una proiezione informativa, mai un errore bloccante.
- La carriera è la fonte di verità di "cosa è chiuso": è la tabella `exams`, e conta solo `passed_registered`. `passed_unregistered` resta un'attività aperta.
- Catalogo, gruppi di scelta e soglie CFU sono versionati per anno accademico in `lib/polimi/catalog/`. Non scrivere codici insegnamento o soglie nel validatore: aggiungili al catalogo dell'anno. Un anno senza Regolamento definitivo si marca `dataStatus: "to_verify"` con `dataStatusReason` e `dataNotes`, e `sources` deve dire di che natura è la fonte (`CatalogSourceKind`), con URL e data di consultazione. Una bozza informativa pubblicata è un dato ufficiale provvisorio: non dichiararla inesistente. I dati non si inventano mai, ma non si sottovaluta nemmeno una fonte che esiste.
- Ogni regola dichiara `provenance`: `manifesto` (attestato), `operational_to_verify` (prassi da confermare nei Servizi Online, per esempio le finestre di presentazione o l'intervallo 30–80 CFU) e `user_simulation` (ipotesi nel simulatore). Vale anche per i vincoli annuali: `catalog.annual.sources` associa a ogni limite la sua fonte **e** la sua provenienza. La UI lo mostra: non spacciare una prassi per vincolo ufficiale.
- Ogni `ValidationIssue` dichiara anche uno `scope`: `current_plan`, `data_quality`, `future_years`, `degree_projection`, `context`. Lo stato del piano (`summary.status`) guarda solo `current_plan`, e la UI usa lo scope per decidere dove mostrare la voce. Un vincolo esigibile a un anno di corso successivo non è mai un errore né un avviso: `rules.ts` abbassa la gravità a "consiglio" quando `dueNow` è falso.
- **"Non scelto" non è "non superato".** Il Regolamento condiziona alcuni obblighi alla *scelta* ("se non scelto al secondo anno deve essere scelto al terzo"), non all'esito dell'esame. `structuralChoice.ts` modella i quattro stati (`closed`, `reinsert_past_frequency`, `choose_in_recovery_table`, `not_due_yet`) e stabilisce se i CFU concorrono al gruppo a scelta. Non usare mai "non verbalizzato", "non acquisito" o "non passato" come sinonimi di "non scelto".
- Un'attività conta in un gruppo a scelta solo nel **contesto in cui è stata scelta**: `validation.ts` costruisce `coverageGroup` (piano corrente > storico compilato > unica offerta possibile) e `rules.ts` conta solo i codici il cui gruppo appartiene alla regola. Non basta che il codice compaia in quella tabella.
- Quando il Regolamento offre due strade per lo stesso obbligo, la seconda si dichiara nel catalogo con `dischargesRuleIds` sulla regola `recovery_required`: sceglierlo in tabella di recupero assolve il blocco del biennio, senza inventare il modulo di progetto che le tabelle del terzo anno non elencano.
- Le funzioni pure del dominio non leggono la data corrente: ricevono `asOf`. È ciò che rende testabile "verbalizzato prima o dopo la presentazione del piano".

## Confini importanti

- Il catalogo e le regole sono specifici a Ingegneria Informatica PoliMi, codice 531; gli anni accademici coperti sono quelli in `lib/polimi/catalog/index.ts`. Non dichiarare conformità ufficiale: è un aiuto offline e il disclaimer in `constraints.ts` va conservato.
- `better-sqlite3` richiede runtime Node, mai Edge runtime. Le route che leggono dati dinamici esportano `dynamic = "force-dynamic"`.
- Non ci sono utenti né autenticazione: un'istanza è per una persona/gruppo fidato. Per pubblicarla usare un reverse proxy con autenticazione.
- Non inserire segreti nel repository; al momento l'app non richiede variabili d'ambiente.

## Comandi di verifica

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test:polimi
pnpm build
pnpm db:seed  # distruttivo: azzera e inserisce dati demo
pnpm start          # server di produzione standalone, lo stesso che gira in Docker
pnpm measure:piano  # peso JS e tempi di /piano: node src/scripts/measure-piano.mjs <baseUrl> <path>
```

`output: "standalone"` è la modalità di produzione: `pnpm start` esegue `.next/standalone/server.js`
dopo aver copiato asset statici e `public/`, come fa il Dockerfile. `next start` resta disponibile
come `pnpm start:next` ma avvisa di non essere compatibile con standalone.

## Convenzioni di modifica

1. Metti accesso dati e logica di dominio in `src/lib`, UI specifica in `src/features`, UI generica in `src/components/ui`.
2. Il linguaggio visivo sta nei token di `globals.css`, non nei componenti: la gerarchia è la scala delle
   superfici (`background` < `surface` < `surface-elevated`, con `surface-muted` per gli incassi), i raggi sono
   due (`rounded-card` per schede e livelli flottanti, `rounded-control` per pulsanti, campi e righe) e l'ombra
   serve solo a ciò che galleggia (`shadow-elevated`). Non scrivere gradienti o colori esadecimali nel JSX.
3. Riusa i primitivi condivisi invece di ridisegnarli: `Card` (con `elevated`/`inset`), `Callout` per ogni
   messaggio in linea, `EmptyState` per gli stati vuoti, `StatTile` per le metriche, `Button`/`IconButton`
   (etichetta obbligatoria) per le azioni, `Badge` per gli stati. Le pillole sono per stati e filtri, non per
   i pulsanti; il maiuscolo spaziato è solo per l'occhiello di `PageHeader`.
4. Riusa i tipi di `src/lib/types.ts` e `src/lib/polimi/constraints.ts`; valida gli input lato server prima di persisterli.
5. Per una nuova mutazione: funzione in `lib` -> wrapper in `app/actions.ts` con gestione errore/revalidazione -> chiamata da componente client.
6. Per modificare regole/corsi PoliMi aggiorna il catalogo dell'anno in `src/lib/polimi/catalog/`, i test in `src/scripts/test-polimi-plan.ts` e, se pertinente, il documento di fonte `polimi_ingegneria_informatica_piano_studi_regole.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
