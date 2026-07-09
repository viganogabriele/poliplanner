/** Graduation rules for Laurea Triennale Ingegneria Informatica (Cod. 358) – Politecnico di Milano */

export const TOTAL_CFU_REQUIRED = 180;

export const CATEGORY_MINIMUMS: Record<string, number> = {
  A: 50,
  B: 60,
  C: 18,
};

export const FREE_CHOICE_CFU_RANGE: [number, number] = [12, 18];
export const FINAL_EXAM_CFU = 5;
export const YEAR_CFU_RANGE: [number, number] = [30, 80];
export const TABA_PICK_COUNT = 1;

export const APPROVED_FREE_CHOICE_GROUPS = [
  "TABAUT", "TABINF", "TABING", "TABTLC", "TABCOM", "TABGEN",
];

export const TABREC_COURSE_CODES = ["085903", "086067"];

export const NOTA_MAGISTRALE = {
  MUST_HAVE: ["088804"],
  SHOULD_HAVE_ONE_OF: [
    "058082", "058083", "058081", "058084", "093506",
    "088805", "085900",
  ],
};

export const TRACKS = {
  I3I: { code: "I3I", label: "Informatica (I3I)", description: "Accesso alla LM in Ingegneria Informatica senza debiti formativi" },
  I3C: { code: "I3C", label: "Comunicazioni (I3C)", description: "Orientamento verso le telecomunicazioni" },
} as const;

export type Track = keyof typeof TRACKS;
export const DEFAULT_TRACK: Track = "I3I";

export const GRADE_MIN = 18;
export const GRADE_MAX = 30;
export const GRADE_LAUDE = "30L";

export type ExamStatus = "planned" | "passed" | "noclass" | "notrequired";
