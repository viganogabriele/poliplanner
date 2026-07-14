/** Graduation rules for Laurea Triennale Ingegneria Informatica (Cod. 531) – Politecnico di Milano */

export const TOTAL_CFU_REQUIRED = 180;
export const COURSE_CODE = "531";
export const ACADEMIC_YEAR = "2025/2026";

export const PROGRAM_IDENTITY = {
  courseCode: COURSE_CODE,
  courseName: "Ingegneria Informatica",
  degreeLevel: "Laurea di primo livello",
  className: "L-8 Ingegneria dell'informazione",
  officialLanguage: "IT",
  school: "Scuola di Ingegneria Industriale e dell'Informazione",
  campuses: ["Milano Leonardo", "Cremona"],
  requiredTotalCfu: TOTAL_CFU_REQUIRED,
} as const;

export const CATEGORY_MINIMUMS: Record<string, number> = {
  A: 50,
  B: 60,
  C: 18,
};

export const CATEGORY_LABELS: Record<string, string> = {
  A: "attività di base",
  B: "attività caratterizzanti",
  C: "attività affini/integrative",
  D: "attività a scelta dello studente",
  V: "prova finale",
  T: "tirocinio",
};

export const FREE_CHOICE_CFU_RANGE: [number, number] = [12, 18];
export const EXTERNAL_FREE_CHOICE_CFU_MAX = 15;
export const FINAL_EXAM_CFU = 5;
export const YEAR_CFU_RANGE: [number, number] = [30, 80];
export const SUPERNUMERARY_CFU_MAX = 32;
export const TABA_PICK_COUNT = 1;

export const APPROVED_FREE_CHOICE_GROUPS = [
  "TABAUT", "TABINF", "TABING", "TABTLC", "TABCOM", "TABGEN", "TIROCINIO",
];

export const TABREC_COURSE_CODES = ["085903", "086067"];
export const PROBSTAT_COURSE_CODES = ["099319", "054304"];
export const I3C_REQUIRED_COURSE_CODES = ["099322"];
export const INTERNSHIP_COURSE_CODES = ["086369", "097654"];

export const PSPA_BY_TRACK = {
  I3I: { year1: "IT1", year2: "IT1", year3: "I3I", campus: "Milano Leonardo", mode: "presenza" },
  I3C: { year1: "IT1", year2: "IT1", year3: "I3C", campus: "Milano Leonardo", mode: "presenza" },
} as const;

export type ActivityCategory = "A" | "B" | "C" | "D" | "V" | "T";
export type BaseArea = "math_info_stats" | "physics_chemistry";
export type CharacterizingArea = "electronics" | "computer_engineering" | "telecommunications";

export const BASE_AREA_RULES: Record<BaseArea, { label: string; min: number; max: number }> = {
  math_info_stats: { label: "Matematica, informatica e statistica", min: 38, max: 50 },
  physics_chemistry: { label: "Fisica e chimica", min: 12, max: 33 },
};

export const BASE_TOTAL_CFU_RANGE: [number, number] = [50, 83];

export const CHARACTERIZING_AREA_RULES: Record<CharacterizingArea, { label: string; min: number; max: number }> = {
  electronics: { label: "Ingegneria elettronica", min: 10, max: 20 },
  computer_engineering: { label: "Ingegneria informatica", min: 20, max: 60 },
  telecommunications: { label: "Ingegneria delle telecomunicazioni", min: 10, max: 60 },
};

export const CHARACTERIZING_TOTAL_CFU_RANGE: [number, number] = [60, 92];

export const COURSE_ACTIVITY_OVERRIDES: Record<string, ActivityCategory> = {
  "082746": "B",
  "085779": "B",
  "086067": "B",
  "099322": "B",
};

export const COURSE_AREA_BY_CODE: Record<string, { kind: "base"; area: BaseArea } | { kind: "characterizing"; area: CharacterizingArea }> = {
  "082740": { kind: "base", area: "math_info_stats" },
  "082747": { kind: "base", area: "math_info_stats" },
  "051124": { kind: "base", area: "physics_chemistry" },
  "052425": { kind: "base", area: "math_info_stats" },
  "085903": { kind: "base", area: "math_info_stats" },
  "099319": { kind: "base", area: "math_info_stats" },
  "085900": { kind: "base", area: "physics_chemistry" },

  "085746": { kind: "characterizing", area: "electronics" },
  "082746": { kind: "characterizing", area: "computer_engineering" },
  "085779": { kind: "characterizing", area: "computer_engineering" },
  "086067": { kind: "characterizing", area: "computer_engineering" },
  "052511": { kind: "characterizing", area: "computer_engineering" },
  "085887": { kind: "characterizing", area: "computer_engineering" },
  "085877": { kind: "characterizing", area: "computer_engineering" },
  "052510": { kind: "characterizing", area: "computer_engineering" },
  "093283": { kind: "characterizing", area: "telecommunications" },
  "097459": { kind: "characterizing", area: "telecommunications" },
  "054303": { kind: "characterizing", area: "telecommunications" },
  "099322": { kind: "characterizing", area: "telecommunications" },
  "093506": { kind: "characterizing", area: "telecommunications" },
  "058083": { kind: "characterizing", area: "telecommunications" },
  "058084": { kind: "characterizing", area: "telecommunications" },
  "054305": { kind: "characterizing", area: "telecommunications" },
  "051231": { kind: "characterizing", area: "telecommunications" },
  "051230": { kind: "characterizing", area: "telecommunications" },
  "051234": { kind: "characterizing", area: "telecommunications" },
};

export const NOTA_MAGISTRALE = {
  MUST_HAVE: ["088804"],
  SHOULD_HAVE_ONE_OF: [
    "085900", "058083", "058081", "058084", "093506",
    "088805", "085900",
  ],
};

export const TRACKS = {
  I3I: { code: "I3I", label: "Informatica (IT1 → I3I)", description: "Milano Leonardo in presenza: biennio IT1, terzo anno informatico" },
  I3C: { code: "I3C", label: "Comunicazioni (IT1 → I3C)", description: "Milano Leonardo in presenza: biennio IT1, terzo anno comunicazioni" },
} as const;

export type Track = keyof typeof TRACKS;
export const DEFAULT_TRACK: Track = "I3I";

export const GRADE_MIN = 18;
export const GRADE_MAX = 30;
export const GRADE_LAUDE = "30L";

export type PlanValidationMode = "annual_submission" | "second_semester_revision";
export type PlanStatus = "draft" | "ready" | "polimi_compiled";
export type ApprovalStatus = "auto_approved_after_deadline" | "needs_commission_review";
export type EntryPosition = "effective" | "supernumerary";
export type EntryOrigin = "recommended" | "carried_over" | "new_frequency" | "recovery_reinserted" | "free_choice";

export type ExamStatus =
  | "planned"
  | "not_passed"
  | "passed_unregistered"
  | "passed_registered"
  | "not_required"
  | "no_class";
