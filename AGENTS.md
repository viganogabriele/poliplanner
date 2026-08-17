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
  polimi/                dominio PoliMi, tutto puro tranne dove indicato
    catalog/             catalogo + regole versionati per anno accademico
    planModel.ts         forma del piano annuale, senza persistenza
    career.ts            carriera: frequenza acquisita vs esame verbalizzato
    annualPlan.ts        reinserimenti, proposta annuale, totali CFU
    rules.ts             motore delle regole dichiarative
    validation.ts        validatore del piano annuale
    simulator.ts         scenari non distruttivi
src/scripts/             utility eseguibili con tsx
public/                  manifest e service worker PWA
```

## Architettura e flussi

- Le pagine sono Server Components e leggono direttamente da `src/lib/*`: non esiste una REST API per le letture.
- I componenti interattivi usano `"use client"` e invocano solo funzioni esportate da `src/app/actions.ts` per scrivere. Ogni mutazione deve rieseguire `revalidatePath("/", "layout")`.
- `schedule` conserva un ID stabile; `lesson_occurrence` è la vista materializzata legata da `schedule_id`, con `mode_override`. `saveSchedule()` aggiorna regole e occorrenze nella stessa transazione, preservando `done` per date/regole invariate.
- SQLite è locale, in WAL mode, con foreign key, timeout e schema v2 versionato da `PRAGMA user_version`. `POLIPLANNER_DB_PATH` è l'override facoltativo; un upgrade legacy fa prima un backup coerente. Non introdurre ORM o migrazioni esterne senza una necessità concreta.
- Il piano ha scenari (`study_plan_cycles`) e righe (`study_plan_entries`). Stato e archiviazione sono distinti; `settings.active_plan_cycle_id` determina il solo scenario usato da dashboard/esami. Gli scenari compilati sono immutabili. Il validatore deve restare puro in `lib/polimi/validation.ts` e i suoi test vivono in `src/scripts/test-polimi-plan.ts`.
- **Un piano è un anno accademico**, non la laurea: prima i reinserimenti (frequenza già acquisita e esame non verbalizzato), poi le nuove frequenze. Solo le nuove frequenze contano per la contribuzione. I 180 CFU sono una proiezione informativa, mai un errore bloccante.
- La carriera è la fonte di verità di "cosa è chiuso": è la tabella `exams`, e conta solo `passed_registered`. `passed_unregistered` resta un'attività aperta.
- Catalogo, gruppi di scelta e soglie CFU sono versionati per anno accademico in `lib/polimi/catalog/`. Non scrivere codici insegnamento o soglie nel validatore: aggiungili al catalogo dell'anno. Un anno senza Manifesto verificato si marca `dataStatus: "to_verify"` con `dataNotes`, non si inventa.
- Ogni regola dichiara `provenance`: `manifesto` (attestato), `operational_to_verify` (prassi da confermare nei Servizi Online, per esempio le finestre di presentazione) e `user_simulation` (ipotesi nel simulatore). La UI lo mostra: non spacciare una prassi per vincolo ufficiale.
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
```

## Convenzioni di modifica

1. Metti accesso dati e logica di dominio in `src/lib`, UI specifica in `src/features`, UI generica in `src/components/ui`.
2. Riusa i tipi di `src/lib/types.ts` e `src/lib/polimi/constraints.ts`; valida gli input lato server prima di persisterli.
3. Per una nuova mutazione: funzione in `lib` -> wrapper in `app/actions.ts` con gestione errore/revalidazione -> chiamata da componente client.
4. Per modificare regole/corsi PoliMi aggiorna il catalogo dell'anno in `src/lib/polimi/catalog/`, i test in `src/scripts/test-polimi-plan.ts` e, se pertinente, il documento di fonte `polimi_ingegneria_informatica_piano_studi_regole.md`.
