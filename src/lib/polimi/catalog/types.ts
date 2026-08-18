/**
 * Catalogo, offerta didattica e regole del Piano degli Studi, versionati per anno accademico.
 *
 * Questo modulo contiene solo tipi: i dati vivono in `aa2025-2026.ts`, `aa2026-2027.ts`, ...
 * La logica del validatore non deve mai contenere codici corso o soglie: legge sempre da qui.
 */

import type { ActivityCategory, BaseArea, CharacterizingArea, ExamStatus, Track } from "../constraints";

export type CourseType = ActivityCategory;
export type Semester = 1 | 2 | "A";
export type CourseYear = 1 | 2 | 3;

export type LinkedExam = {
  code: string;
  name: string;
  cfu: number;
  type: CourseType[];
};

/** Un'offerta è il contesto ufficiale (anno, semestre, percorso, gruppo) in cui un corso è erogato. */
export type CourseOffering = {
  year: CourseYear;
  semester: 1 | 2;
  tracks: Track[];
  group: string | null;
  compulsory: boolean;
  category: CourseType;
  linkedModules?: string[];
  language?: "IT" | "EN";
};

export type Course = {
  code: string;
  name: string;
  year: CourseYear;
  semester: Semester;
  cfu: number;
  type: CourseType[];
  isElective: boolean;
  electiveGroup: string | null;
  track: Track | "both" | null;
  isCompulsory: boolean;
  alternativeTo: string | null;
  linkedExams: LinkedExam[];
  isSoprannumero: boolean;
  isLinkedExam?: boolean;
  parentCode?: string;
  description?: string;
  offerings?: CourseOffering[];
  /**
   * Insegnamento a numero chiuso secondo il Manifesto. La disponibilità di posti non è
   * verificabile offline: la UI lo dichiara come limitazione, non come errore.
   */
  enrolmentCapped?: boolean;
};

export type ElectiveGroup = {
  /** Nome leggibile del gruppo: la UI non deve mai mostrare la sigla da sola. */
  label: string;
  description: string;
  maxPicks: number | null;
  minPicks: number | null;
  tracks: Track[] | null;
};

export type AreaMapping =
  | { kind: "base"; area: BaseArea }
  | { kind: "characterizing"; area: CharacterizingArea };

// ---------------------------------------------------------------------------
// Regole dichiarative
// ---------------------------------------------------------------------------

/**
 * Da dove viene una regola. Serve a non spacciare per vincolo ufficiale ciò che è
 * una prassi operativa o un'ipotesi dell'utente.
 *
 * - `manifesto`: vincolo direttamente attestato dal Manifesto/Regolamento.
 * - `operational_to_verify`: regola operativa plausibile ma da verificare nei Servizi Online
 *   (finestre di presentazione, cosa si può ancora aggiungere, moduli associati ai recuperi).
 * - `user_simulation`: ipotesi introdotta dall'utente nel simulatore.
 */
export type RuleProvenance = "manifesto" | "operational_to_verify" | "user_simulation";

export const PROVENANCE_LABELS: Record<RuleProvenance, string> = {
  manifesto: "Attestato dal Manifesto",
  operational_to_verify: "Regola operativa da verificare sui Servizi Online",
  user_simulation: "Ipotesi di simulazione",
};

/** Ambito di applicazione di una regola: percorso e anno di corso in cui diventa esigibile. */
export type RuleScope = {
  /** Anno di corso entro cui la regola deve risultare soddisfatta. */
  dueByYear: CourseYear;
  /** Percorsi a cui si applica; assente = tutti. */
  tracks?: Track[];
};

/** Associazione corso progettuale → modulo di prova finale, con il contesto in cui è attestata. */
export type LinkedModulePair = {
  parent: string;
  module: string;
  /**
   * Gruppi/blocchi in cui il Manifesto mostra esplicitamente l'associazione.
   * `null` = sempre attestata. Se il corso padre è nel piano in un contesto diverso
   * (tipicamente un recupero TABREC), l'obbligo del modulo diventa da verificare.
   */
  attestedGroups: string[] | null;
  semester: 1 | 2;
  note?: string;
};

export type RuleAlternative = {
  id: string;
  label: string;
  /** Codici che devono essere tutti presenti. */
  requireAll: string[];
  /** Ulteriore scelta secca dentro l'alternativa (es. un corso TABA). */
  pickOneOf?: { codes: string[]; count: number };
};

export type RuleBundle = {
  id: string;
  label: string;
  codes: string[];
};

type RuleBase = { id: string; label: string; source: string; provenance: RuleProvenance };

export type PlanRule =
  | ({ kind: "required_all"; codes: string[] } & RuleBase & RuleScope)
  | ({ kind: "exactly_one"; codes: string[] } & RuleBase & RuleScope)
  | ({ kind: "alternatives"; options: RuleAlternative[] } & RuleBase & RuleScope)
  | ({ kind: "bundle_exactly_one"; bundles: RuleBundle[] } & RuleBase & RuleScope)
  | ({
      kind: "choice_cfu";
      groups: string[];
      requiredCfu: number;
      countsExternal: boolean;
      /**
       * true quando le tabelle del gruppo contengono insegnamenti del secondo semestre:
       * il totale può essere completato anche nella finestra di modifica semestrale,
       * quindi un ammanco alla presentazione annuale non è un errore bloccante.
       */
      completableInSecondSemesterWindow: boolean;
    } & RuleBase & RuleScope)
  | ({
      kind: "recovery_required";
      codes: string[];
      /**
       * Regole del biennio che la scelta nella tabella di recupero **assolve**.
       *
       * Serve perché il Regolamento offre due strade alternative per lo stesso obbligo: scegliere
       * l'insegnamento nel blocco del secondo anno, oppure — se non lo si è scelto — nella tabella
       * di recupero al terzo. Senza questo collegamento il blocco del secondo anno resterebbe
       * "incompleto" per sempre e pretenderebbe anche il modulo di progetto da 1 CFU, che invece le
       * tabelle del terzo anno non elencano.
       */
      dischargesRuleIds?: string[];
    } & RuleBase & RuleScope)
  | ({ kind: "linked_modules"; pairs: LinkedModulePair[] } & RuleBase)
  | ({ kind: "single_instance"; codes: string[]; maxSelected: number } & RuleBase)
  | ({ kind: "advisory_any_of"; codes: string[]; message: string } & RuleBase);

// ---------------------------------------------------------------------------
// Configurazione annuale e di laurea
// ---------------------------------------------------------------------------

/**
 * Un vincolo annuale con la propria fonte e provenienza. Serve perché non tutti i limiti
 * dell'anno stanno nel Regolamento del corso: l'intervallo CFU della presentazione ordinaria,
 * per esempio, viene dalle norme di presentazione del piano e va dichiarato come tale.
 */
export type AnnualSource = { source: string; provenance: RuleProvenance };

export type AnnualSourceKey =
  | "cfuRange"
  | "reinsertions"
  | "contribution"
  | "supernumerary"
  | "externalChoices"
  | "revision";

export type AnnualRules = {
  /**
   * Intervallo CFU ammesso dalla presentazione ordinaria.
   * Viene applicato alla metrica indicata da `rangeAppliesTo`.
   */
  cfuRange: [number, number];
  rangeAppliesTo: "new_frequency_cfu";
  /**
   * `null` = il Manifesto non dice esplicitamente se i reinserimenti occupano
   * lo spazio delle nuove frequenze. In quel caso il validatore lo segnala come
   * "da verificare" invece di dedurlo.
   */
  reinsertionsCountTowardRange: boolean | null;
  /** Metrica usata per la contribuzione/tasse. */
  contributionMetric: "new_frequency_cfu";
  supernumeraryMaxCfu: number;
  externalFreeChoiceMaxCfu: number;
  /** Stati esame che implicano una frequenza già acquisita anche senza piano precedente. */
  frequencyImplyingExamStatuses: ExamStatus[];
  /** Stati esame che chiudono definitivamente l'attività. */
  settledExamStatuses: ExamStatus[];
  secondSemesterRevision: {
    editableSemester: 1 | 2;
    allowTrackChange: boolean;
    allowSelfCertification: boolean;
  };
  sources: Record<AnnualSourceKey, AnnualSource>;
};

export type DegreeRules = {
  totalCfu: number;
  categoryMinimums: Partial<Record<ActivityCategory, number>>;
  freeChoiceCfuRange: [number, number];
  finalExamCfu: number;
  baseAreaRules: Record<BaseArea, { label: string; min: number; max: number }>;
  baseTotalCfuRange: [number, number];
  characterizingAreaRules: Record<CharacterizingArea, { label: string; min: number; max: number }>;
  characterizingTotalCfuRange: [number, number];
  sources: Record<string, string>;
};

export type CatalogDataStatus = "verified_from_manifesto" | "to_verify";

/**
 * Natura di una fonte del catalogo. Distinguere la bozza dal documento definitivo è la
 * differenza tra "dato provvisorio" e "dato inesistente": la seconda non va mai dichiarata
 * se un documento ufficiale, anche non definitivo, esiste ed è stato trascritto.
 */
export type CatalogSourceKind =
  /** Regolamento/Manifesto approvato e definitivo. */
  | "regolamento_final"
  /** Bozza informativa pubblicata dall'ateneo: ufficiale ma soggetta a modifiche. */
  | "regolamento_draft"
  /** Norme di presentazione del piano degli studi, fuori dal Regolamento del corso. */
  | "plan_submission_rules"
  /** Estrazione interna al repository usata come documento di lavoro. */
  | "internal_extraction";

export const CATALOG_SOURCE_KIND_LABELS: Record<CatalogSourceKind, string> = {
  regolamento_final: "Regolamento definitivo",
  regolamento_draft: "Bozza informativa ufficiale",
  plan_submission_rules: "Norme di presentazione del piano",
  internal_extraction: "Estrazione interna di lavoro",
};

export type CatalogSource = {
  label: string;
  kind: CatalogSourceKind;
  /** URL pubblico della fonte, quando esiste. */
  url?: string;
  /** Data di consultazione della fonte, in formato YYYY-MM-DD. */
  retrievedOn?: string;
  note?: string;
};

export type Catalog = {
  academicYear: string;
  courseCode: string;
  dataStatus: CatalogDataStatus;
  /**
   * Perché lo stato dei dati è quello dichiarato, in una frase. Va detto cosa manca
   * davvero: una bozza pubblicata non è un Manifesto assente.
   */
  dataStatusReason: string;
  /** Note mostrate all'utente quando i dati non sono confermati sul Manifesto ufficiale. */
  dataNotes: string[];
  sources: CatalogSource[];
  courses: Course[];
  electiveGroups: Record<string, ElectiveGroup>;
  rules: PlanRule[];
  annual: AnnualRules;
  degree: DegreeRules;
  /** Proposta di nuove frequenze per anno di corso, prima di sottrarre carriera e reinserimenti. */
  defaultNewFrequencies: Record<Track, Record<CourseYear, string[]>>;
  areaByCode: Record<string, AreaMapping>;
  activityCategoryOverrides: Record<string, ActivityCategory>;
  freeChoiceGroups: string[];
};
