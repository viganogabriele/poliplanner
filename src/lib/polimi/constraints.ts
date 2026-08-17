/**
 * Identità del corso e tipi condivisi – Laurea Triennale Ingegneria Informatica (Cod. 531), PoliMi.
 *
 * Qui vivono solo costanti non versionate (identità del corso, scala dei voti) e i tipi di dominio.
 * Catalogo, soglie CFU e regole strutturali sono versionati per anno accademico in `catalog/`.
 */

export const COURSE_CODE = "531";

export const PROGRAM_IDENTITY = {
  courseCode: COURSE_CODE,
  courseName: "Ingegneria Informatica",
  degreeLevel: "Laurea di primo livello",
  className: "L-8 Ingegneria dell'informazione",
  officialLanguage: "IT",
  school: "Scuola di Ingegneria Industriale e dell'Informazione",
  campuses: ["Milano Leonardo", "Cremona"],
} as const;

export const DISCLAIMER =
  "Poliplanner è un assistente offline e non è una fonte ufficiale: verifica sempre il piano sui Servizi Online PoliMi.";

export const CATEGORY_LABELS: Record<string, string> = {
  A: "attività di base",
  B: "attività caratterizzanti",
  C: "attività affini/integrative",
  D: "attività a scelta dello studente",
  V: "prova finale",
  T: "tirocinio",
};

export const PSPA_BY_TRACK = {
  I3I: { year1: "IT1", year2: "IT1", year3: "I3I", campus: "Milano Leonardo", mode: "presenza" },
  I3C: { year1: "IT1", year2: "IT1", year3: "I3C", campus: "Milano Leonardo", mode: "presenza" },
} as const;

export const TRACKS = {
  I3I: { code: "I3I", label: "Informatica (IT1 → I3I)", description: "Milano Leonardo in presenza: biennio IT1, terzo anno informatico" },
  I3C: { code: "I3C", label: "Comunicazioni (IT1 → I3C)", description: "Milano Leonardo in presenza: biennio IT1, terzo anno comunicazioni" },
} as const;

export type Track = keyof typeof TRACKS;
export const DEFAULT_TRACK: Track = "I3I";

export type ActivityCategory = "A" | "B" | "C" | "D" | "V" | "T";
export type BaseArea = "math_info_stats" | "physics_chemistry";
export type CharacterizingArea = "electronics" | "computer_engineering" | "telecommunications";

export const GRADE_MIN = 18;
export const GRADE_MAX = 30;
export const GRADE_LAUDE = "30L";

export type PlanValidationMode = "annual_submission" | "second_semester_revision";
export type PlanStatus = "draft" | "ready" | "polimi_compiled";
export type ApprovalStatus = "auto_approved_after_deadline" | "needs_commission_review";
export type EntryPosition = "effective" | "supernumerary";

/**
 * Origine di una voce del piano annuale.
 * `recommended` e `carried_over` restano accettati per compatibilità con i dati già salvati;
 * il modello corrente usa `recovery_reinserted` per i reinserimenti e
 * `new_frequency` / `free_choice` per le nuove frequenze.
 */
export type EntryOrigin = "recommended" | "carried_over" | "new_frequency" | "recovery_reinserted" | "free_choice";

export const REINSERTION_ORIGINS: EntryOrigin[] = ["carried_over", "recovery_reinserted"];

export type ExamStatus =
  | "planned"
  | "not_passed"
  | "passed_unregistered"
  | "passed_registered"
  | "not_required"
  | "no_class";

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  planned: "Pianificato",
  not_passed: "Non superato",
  passed_unregistered: "Superato, non verbalizzato",
  passed_registered: "Verbalizzato",
  not_required: "Non richiesto",
  no_class: "Senza frequenza",
};
