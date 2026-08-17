/**
 * Catalogo e regole AA 2026/2027 – PROVVISORI.
 *
 * Al momento della scrittura il Manifesto AA 2026/2027 per il corso 531 non è disponibile in forma
 * verificata. Per non bloccare la pianificazione, questo catalogo riusa la struttura 2025/2026
 * marcandola `to_verify`: l'interfaccia mostra "dati da verificare" e il validatore aggiunge un
 * avviso non silenziabile. Nessun corso, CFU o soglia è inventato: sono esattamente quelli
 * dell'anno precedente, in attesa del Manifesto ufficiale.
 */

import { CATALOG_2025_2026 } from "./aa2025-2026";
import type { Catalog } from "./types";

export const CATALOG_2026_2027: Catalog = {
  ...CATALOG_2025_2026,
  academicYear: "2026/2027",
  dataStatus: "to_verify",
  dataNotes: [
    "Il Manifesto AA 2026/2027 del corso 531 non è ancora stato verificato: catalogo, gruppi di scelta e soglie CFU sono quelli dell'AA 2025/2026.",
    "Codici insegnamento, CFU, semestri e composizione dei gruppi TABREC/TABAUT/TABINF/TABING/TABTLC/TABCOM/TABGEN possono cambiare.",
    "Prima di presentare il piano confronta ogni riga con il Manifesto AA 2026/2027 sui Servizi Online PoliMi.",
    ...CATALOG_2025_2026.dataNotes,
  ],
  sources: [
    "Struttura derivata dall'AA 2025/2026 in attesa del Manifesto AA 2026/2027",
    ...CATALOG_2025_2026.sources,
  ],
};
