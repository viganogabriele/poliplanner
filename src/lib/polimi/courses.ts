/** Course catalog – Laurea Triennale Ingegneria Informatica Cod. 531, Politecnico di Milano */

export type CourseType = "A" | "B" | "C" | "D" | "V" | "T";
export type Semester = 1 | 2 | "A";

export type LinkedExam = {
  code: string;
  name: string;
  cfu: number;
  type: CourseType[];
};

export type CourseOffering = {
  academicYear: "2025/2026";
  year: 1 | 2 | 3;
  semester: 1 | 2;
  tracks: ("I3I" | "I3C")[];
  group: string | null;
  compulsory: boolean;
  category: CourseType;
  linkedModules?: string[];
  language?: "IT" | "EN";
};

export type Course = {
  code: string;
  name: string;
  year: 1 | 2 | 3;
  semester: Semester;
  cfu: number;
  type: CourseType[];
  isElective: boolean;
  electiveGroup: string | null;
  track: "I3I" | "I3C" | "both" | null;
  isCompulsory: boolean;
  alternativeTo: string | null;
  linkedExams: LinkedExam[];
  isSoprannumero: boolean;
  isLinkedExam?: boolean;
  parentCode?: string;
  description?: string;
  /** Official contexts. Legacy convenience fields above remain for presentational compatibility. */
  offerings?: CourseOffering[];
};

export const COURSES: Course[] = [
  // YEAR 1 – Common
  { code: "082740", name: "Analisi Matematica 1", year: 1, semester: 1, cfu: 10, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082746", name: "Fondamenti di Informatica", year: 1, semester: 1, cfu: 10, type: ["A", "B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082747", name: "Geometria e Algebra Lineare", year: 1, semester: 1, cfu: 8, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051124", name: "Fisica", year: 1, semester: 2, cfu: 12, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082748", name: "Elettrotecnica", year: 1, semester: 2, cfu: 10, type: ["C"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "054303", name: "Fondamenti di Comunicazioni e Internet", year: 1, semester: 2, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 2 – Common compulsory
  { code: "052425", name: "Analisi Matematica 2", year: 2, semester: 1, cfu: 10, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085779", name: "Architettura dei Calcolatori e Sistemi Operativi", year: 2, semester: 1, cfu: 10, type: ["A", "B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085905", name: "Fondamenti di Automatica", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 2 – TABREC
  { code: "085903", name: "Logica e Algebra", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABREC", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Obbligatorio per I3I; reinseribile al terzo anno tramite TABREC.", offerings: [
    { academicYear: "2025/2026", year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "B1", compulsory: false, category: "C", language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 1, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", language: "IT" },
  ] },
  { code: "086067", name: "Algoritmi e Principi dell'Informatica", year: 2, semester: 2, cfu: 10, type: ["A", "B"], isElective: true, electiveGroup: "TABREC", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [{ code: "052509", name: "Prova Finale (Progetto Algoritmi e Strutture Dati)", cfu: 1, type: ["V"] }], isSoprannumero: false, description: "Richiesto per I3I. Se non scelto al 2° anno, obbligatorio al 3° (TABREC).", offerings: [
    { academicYear: "2025/2026", year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "B", linkedModules: ["052509"], language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", linkedModules: ["052509"], language: "IT" },
  ] },
  { code: "052509", name: "Prova Finale (Progetto Algoritmi e Strutture Dati)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "086067" },

  // YEAR 2 – Probability/stats alternatives
  { code: "099319", name: "Probabilità e Statistica per l'Informatica", year: 2, semester: 2, cfu: 10, type: ["A"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "054304", linkedExams: [], isSoprannumero: false, description: "Alternativo a Informazione e Stima." },
  { code: "054304", name: "Informazione e Stima (per Ing. Informatica)", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "099319", linkedExams: [], isSoprannumero: false, description: "Alternativo a Probabilità e Statistica." },

  // YEAR 2 – Optional
  { code: "093506", name: "Elettromagnetismo e Campi", year: 2, semester: 1, cfu: 10, type: ["B"], isElective: true, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Opzionale, consigliato per I3C." },
  { code: "099322", name: "Segnali per le Comunicazioni", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [{ code: "054440", name: "Prova Finale (Progetto Segnali per le Comunicazioni)", cfu: 1, type: ["V"] }], isSoprannumero: false, description: "Obbligatorio per I3C; opzionale nelle tabelle del terzo anno.", offerings: [
    { academicYear: "2025/2026", year: 2, semester: 2, tracks: ["I3C", "I3I"], group: "B3", compulsory: false, category: "B", linkedModules: ["054440"], language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
  ] },
  { code: "054440", name: "Prova Finale (Progetto Segnali per le Comunicazioni)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "099322" },

  // YEAR 2 – TABA (pick exactly 1)
  { code: "085900", name: "Chimica Generale", year: 2, semester: 1, cfu: 5, type: ["A"], isElective: true, electiveGroup: "TABA", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, offerings: [
    { academicYear: "2025/2026", year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "TABA", compulsory: false, category: "A", language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 1, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D", language: "IT" },
  ] },
  { code: "058081", name: "Fisica Tecnica", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "058083", name: "Misure", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "058084", name: "Onde Elettromagnetiche e Mezzi Trasmissivi", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 3 – Common compulsory
  { code: "085746", name: "Fondamenti di Elettronica", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "both", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051289", name: "Economia e Organizzazione Aziendale", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: null, track: "both", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 3 – I3I compulsory
  { code: "052511", name: "Sistemi Informativi (per il Settore dell'Informazione)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085887", name: "Basi di Dati 1", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085877", name: "Reti Logiche", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, linkedExams: [{ code: "054441", name: "Prova Finale (Reti Logiche)", cfu: 1, type: ["V"] }], isSoprannumero: false },
  { code: "054441", name: "Prova Finale (Reti Logiche)", year: 3, semester: 1, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "085877" },
  { code: "052510", name: "Ingegneria del Software", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, linkedExams: [{ code: "085923", name: "Prova Finale (Ingegneria del Software)", cfu: 3, type: ["V"] }], isSoprannumero: false },
  { code: "085923", name: "Prova Finale (Ingegneria del Software)", year: 3, semester: 1, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "052510" },
  { code: "063149", name: "Information Systems", year: 3, semester: 1, cfu: 5, type: ["A", "B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: "052511", linkedExams: [], isSoprannumero: false, description: "Parte del bundle obbligatorio in lingua inglese." },
  { code: "063579", name: "Databases", year: 3, semester: 1, cfu: 5, type: ["A", "B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: "085887", linkedExams: [], isSoprannumero: false, description: "Parte del bundle obbligatorio in lingua inglese." },
  { code: "063150", name: "Economics & Business Administration", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: "051289", linkedExams: [], isSoprannumero: false, description: "Parte del bundle obbligatorio in lingua inglese." },

  // YEAR 3 – I3I – TABAUT
  { code: "088877", name: "Teoria dei Sistemi (Dinamica Non Lineare)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085901", name: "Automazione Industriale", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 3 – I3I – TABINF
  { code: "056889", name: "Foundations of Artificial Intelligence", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "059429", name: "Fondamenti di Human-Computer Interaction", year: 3, semester: 1, cfu: 5, type: ["A", "B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "052512", name: "Bioinformatics Algorithms", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "054221", name: "Fondamenti di Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089020", name: "Progetto di Ingegneria Informatica", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089013", name: "Robotics", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085879", name: "Tecnologie Informatiche per il Web", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 3 – I3I – TABING
  { code: "088805", name: "Fisica Tecnica", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "088804", name: "Meccanica (per Ing. Informatica)", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Consigliato: obbligatorio alla LM." },

  // YEAR 3 – I3I – TABTLC
  { code: "054305", name: "Dispositivi per la Trasmissione dell'Informazione", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, offerings: [
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
  ] },
  { code: "059431", name: "Introduzione alle Tecnologie di Interconnessione", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, offerings: [
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
  ] },
  { code: "059430", name: "Problemi Inversi Applicati al Telerilevamento", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051231", name: "Ottica e Immagini", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051230", name: "Sicurezza delle Reti", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051234", name: "Software Defined Networking", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [{ code: "054442", name: "Prova Finale (Software Defined Networking)", cfu: 1, type: ["V"] }], isSoprannumero: false, offerings: [
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "EN" },
    { academicYear: "2025/2026", year: 3, semester: 2, tracks: ["I3C"], group: null, compulsory: true, category: "B", linkedModules: ["054442"], language: "EN" },
  ] },

  // YEAR 3 – I3I – Tirocinio
  { code: "086369", name: "Tirocinio (Ing. Informatica)", year: 3, semester: "A", cfu: 10, type: ["T"], isElective: true, electiveGroup: "TIROCINIO", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "097654", name: "Tirocinio (Ing. Informatica)", year: 3, semester: "A", cfu: 5, type: ["T"], isElective: true, electiveGroup: "TIROCINIO", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // YEAR 3 – I3C compulsory
  { code: "093283", name: "Fondamenti di Elaborazione Numerica dei Segnali", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "097459", name: "Sistemi di Comunicazione", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, linkedExams: [{ code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", cfu: 3, type: ["V"] }], isSoprannumero: false },
  { code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", year: 3, semester: 1, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "097459" },
  { code: "054442", name: "Prova Finale (Software Defined Networking)", year: 3, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "051234" },

  // YEAR 3 – I3C choices
  { code: "089180", name: "Numerical Analysis", year: 3, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "083049", linkedExams: [], isSoprannumero: false },
  { code: "083049", name: "Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "089180", linkedExams: [], isSoprannumero: false },
];

export const getCourse = (code: string): Course | undefined =>
  COURSES.find((c) => c.code === code);

export function getCourseOfferings(course: Course): CourseOffering[] {
  if (course.offerings) return course.offerings;
  return [{
    academicYear: "2025/2026",
    year: course.year,
    semester: course.semester === "A" ? 1 : course.semester,
    tracks: course.track === null || course.track === "both" ? ["I3I", "I3C"] : [course.track],
    group: course.electiveGroup,
    compulsory: course.isCompulsory,
    category: course.type[0] ?? "C",
    linkedModules: course.linkedExams.map((module) => module.code),
  }];
}

export function getCourseOffering(code: string, track: "I3I" | "I3C", year?: number, semester?: number): CourseOffering | undefined {
  const course = getCourse(code);
  return course && getCourseOfferings(course).find((offering) =>
    offering.tracks.includes(track)
    && (year === undefined || offering.year === year)
    && (semester === undefined || offering.semester === semester)
  );
}

export const getCoursesByYear = (year: number): Course[] =>
  COURSES.filter((c) => c.year === year);

export const getGroup = (groupKey: string): Course[] =>
  COURSES.filter((c) => c.electiveGroup === groupKey);

export const ELECTIVE_GROUPS: Record<string, { label: string; description: string; maxPicks: number | null; minPicks: number | null; tracks: string[] | null }> = {
  TABA:      { label: "TABA",      description: "Scegli esattamente 1 corso",                          maxPicks: 1,    minPicks: 1,    tracks: null },
  TABREC:    { label: "TABREC",    description: "Recupero: obbligatorio se non scelto al 2° anno",     maxPicks: null, minPicks: null, tracks: ["I3I"] },
  TABAUT:    { label: "TABAUT",    description: "Una delle tabelle ammesse nei 15 CFU complessivi",    maxPicks: null, minPicks: 0,    tracks: ["I3I"] },
  TABINF:    { label: "TABINF",    description: "Una delle tabelle ammesse nei 15 CFU complessivi",    maxPicks: null, minPicks: 0,    tracks: ["I3I"] },
  TABING:    { label: "TABING",    description: "Una delle tabelle ammesse nei 15 CFU complessivi",    maxPicks: null, minPicks: 0,    tracks: ["I3I"] },
  TABTLC:    { label: "TABTLC",    description: "Telecomunicazioni: opzionale per I3I",                maxPicks: null, minPicks: 0,    tracks: ["I3I"] },
  TABCOM:    { label: "TABCOM",    description: "Una delle tabelle ammesse nei 15 CFU complessivi",    maxPicks: null, minPicks: 0,    tracks: ["I3C"] },
  TABGEN:    { label: "TABGEN",    description: "Una delle tabelle ammesse nei 15 CFU complessivi",    maxPicks: null, minPicks: 0,    tracks: ["I3C"] },
  PROBSTAT:  { label: "PROBSTAT",  description: "Scegli uno tra Probabilità e Statistica o Informazione e Stima", maxPicks: 1, minPicks: 1, tracks: null },
  TIROCINIO: { label: "TIROCINIO", description: "Tirocinio opzionale (5 o 10 CFU)",                    maxPicks: 1,    minPicks: 0,    tracks: null },
};
