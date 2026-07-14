# Poliplanner

Planner locale e self-hostable per studenti del Politecnico di Milano. Permette di gestire lezioni, materie, esami e scenari del piano di studi di Ingegneria Informatica (codice 531), mantenendo i dati in un singolo database SQLite sul proprio computer o server.

> Il controllo del piano è un aiuto offline: prima di una scelta ufficiale verificare sempre le regole e le scadenze nei Servizi Online PoliMi.

## Funzionalità

| Area | Cosa fa |
| --- | --- |
| Dashboard | Riepilogo delle lezioni, progressi per materia, esami e KPI. |
| Lezioni | Elenco di arretrati/lezioni odierne, completamento ottimistico e modalità presenza/asincrona. |
| Calendario | Calendario settimanale e modifica delle regole ricorrenti. |
| Materie | Dettaglio di ciascuna materia, lezioni da recuperare/guardare ed esame collegato. |
| Piano di studi | Scenari annuali o di revisione, validazione CFU/vincoli, reinserimenti e stima CFU tassabili. |
| Esami | Stato, data di superamento/registrazione, voto, media pesata e stima del voto di laurea. |
| PWA | Installabile con asset statici; non memorizza pagine o dati personali del planner. |

## Stack e requisiti

Next.js 16, React 19, TypeScript, Tailwind CSS 4 e SQLite (`better-sqlite3`). Non servono servizi esterni, account cloud o variabili d'ambiente.

Per lo sviluppo locale:

- Node.js 20 o successivo (consigliato Node 22 LTS)
- pnpm 11 o successivo
- strumenti di compilazione C/C++ solo se `better-sqlite3` non trova un binario precompilato (`python3`, `make`, compilatore C++)

## Avvio locale per sviluppo e modifiche

```bash
git clone https://github.com/viganogabriele/poliplanner.git
cd poliplanner
corepack enable
pnpm install

# Facoltativo: elimina eventuali dati e carica dati demo
pnpm db:seed

pnpm dev
```

Apri <http://localhost:3000>. Le modifiche ai file sotto `src/` aggiornano l'app in sviluppo automaticamente.

### Comandi utili

```bash
pnpm lint          # controlli ESLint
pnpm test:polimi   # test dei vincoli del piano di studi
pnpm build         # build di produzione; deve passare prima del deploy
pnpm start         # serve la build su http://localhost:3000
PORT=8333 pnpm start
```

`pnpm db:seed` e `pnpm db:reset` sono distruttivi: ricreano il database e inseriscono dati demo. Non usarli su un'installazione con dati reali.

## Dati e backup

Il database viene creato automaticamente in `db/lesson_tracker.db`; non è incluso in Git. SQLite usa anche file temporanei `-wal` e `-shm` mentre l'app è in esecuzione. Per un percorso diverso si può impostare `POLIPLANNER_DB_PATH` (utile in deploy); la directory viene creata automaticamente.

Al primo avvio di una versione legacy, Poliplanner crea un backup coerente `lesson_tracker.pre-v2-<timestamp>.db` prima del reset autorizzato allo schema v2. Se il backup fallisce, il database originale non viene modificato.

Per un backup coerente, fermare l'app/contenitore e copiare l'intera directory `db/`. Per un'istanza Docker, il volume si chiama `poliplanner-data`:

```bash
docker compose stop
docker run --rm -v poliplanner-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/poliplanner-db-$(date +%F).tar.gz -C /data .
docker compose start
```

Conservare il backup fuori dal server. Per ripristinarlo, fermare l'app, svuotare il database corrente e riestrarre l'archivio nella stessa directory/volume.

## Deploy e self-hosting

### Opzione A — Node.js sul server

Sul server clona il repository, installa Node/pnpm e avvia la build:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
PORT=3000 pnpm start
```

Per tenerla attiva dopo il logout usare un gestore di processi (systemd, PM2 o equivalente) con directory di lavoro impostata alla root del repository. Il suo utente deve poter scrivere in `db/`. Dopo un aggiornamento eseguire `git pull`, `pnpm install --frozen-lockfile`, `pnpm build` e riavviare il processo; fare prima un backup della directory `db/`.

### Opzione B — Docker Compose (consigliata)

Il repository include `Dockerfile` e `compose.yaml`. L'immagine contiene una build Next.js standalone; il database resta nel volume nominato e quindi sopravvive a rebuild/ricreazione del container.

```bash
git clone https://github.com/viganogabriele/poliplanner.git
cd poliplanner
docker compose up -d --build
docker compose logs -f
```

Per impostazione predefinita l'app risponde solo su `127.0.0.1:3000`, adatta a un reverse proxy sullo stesso host. Per esporla in LAN modifica esplicitamente il mapping in `compose.yaml`. Per aggiornare:

```bash
git pull
docker compose up -d --build
```

### Esposizione sicura

Poliplanner **non ha autenticazione né gestione multiutente**. Non pubblicare `http://server:3000` direttamente su Internet: chiunque possa raggiungerla può leggere, modificare o cancellare i dati. Usarla in LAN/VPN oppure metterla dietro un reverse proxy HTTPS con autenticazione (ad esempio Authelia, OAuth2 Proxy, Cloudflare Access o l'autenticazione del proprio proxy) e limitare l'accesso alle persone fidate.

Se usi un proxy sullo stesso server, limita la porta del compose a localhost modificando `compose.yaml` in `"127.0.0.1:3000:3000"`, poi fai puntare il proxy a `http://127.0.0.1:3000`.

## Struttura e guida per contributori/LLM

La mappa dell'architettura, i flussi dati, i confini del dominio e le convenzioni sono in [AGENTS.md](AGENTS.md). È un documento intenzionalmente compatto: leggilo prima di modificare il codice, sia come contributore sia come assistente AI.

In sintesi:

```text
src/app            route, layout e Server Actions
src/features       UI e interazioni per dominio
src/components     componenti di layout/UI riusabili
src/lib            logica applicativa, SQLite, tipi e validatore PoliMi
src/lib/polimi     catalogo corsi, vincoli e calcoli del piano
src/scripts        seed e test eseguibili
public             asset PWA
db                 dati SQLite locali (ignorati da Git)
```

## Database

| Tabella | Responsabilità |
| --- | --- |
| `schedule` | Regole ricorrenti con ID stabile, materia, codice corso opzionale e modalità predefinita. |
| `lesson_occurrence` | Occorrenze materializzate collegate a `schedule_id`, completamento e override di modalità. |
| `settings` | Configurazione chiave-valore, incluso lo scenario del piano attivo. |
| `study_plan_cycles` | Scenari: stato (`draft`/`ready`/`polimi_compiled`) separato dall'archiviazione. |
| `study_plan_entries` | Attività catalogo o esterne, semestre, posizione e metadati calcolati dal server. |
| `exams` | Stato, voto e date degli esami per codice corso. |

## Licenza

Questo progetto è distribuito secondo i termini del file [LICENSE](LICENSE).
