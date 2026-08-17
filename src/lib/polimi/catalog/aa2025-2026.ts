/**
 * Catalogo e regole AA 2025/2026 – Ingegneria Informatica 531, Milano Leonardo in presenza.
 *
 * Fonte: `polimi_ingegneria_informatica_piano_studi_regole.md` (estrazione del Manifesto/Regolamento
 * AA 2025/2026). I riferimenti `source` di ogni regola puntano ai paragrafi di quel documento,
 * così il validatore può mostrare all'utente quale regola sta applicando.
 */

import type { AnnualRules, Catalog, Course, DegreeRules, ElectiveGroup, PlanRule } from "./types";
import type { AreaMapping } from "./types";
import type { ActivityCategory, Track } from "../constraints";

const TABA_CODES = ["085900", "058081", "058083", "058084"];

export const COURSES_2025_2026: Course[] = [
  // ---------------------------------------------------------------- ANNO 1 (IT1)
  { code: "082740", name: "Analisi Matematica 1", year: 1, semester: 1, cfu: 10, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082746", name: "Fondamenti di Informatica", year: 1, semester: 1, cfu: 10, type: ["A", "B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082747", name: "Geometria e Algebra Lineare", year: 1, semester: 1, cfu: 8, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "051124", name: "Fisica", year: 1, semester: 2, cfu: 12, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "082748", name: "Elettrotecnica", year: 1, semester: 2, cfu: 10, type: ["C"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "054303", name: "Fondamenti di Comunicazioni e Internet", year: 1, semester: 2, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ---------------------------------------------------------------- ANNO 2 (IT1) – fissi
  { code: "052425", name: "Analisi Matematica 2", year: 2, semester: 1, cfu: 10, type: ["A"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085779", name: "Architettura dei Calcolatori e Sistemi Operativi", year: 2, semester: 1, cfu: 10, type: ["A", "B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085905", name: "Fondamenti di Automatica", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: null, isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ---------------------------------------------------------------- ANNO 2 – blocco B1
  {
    code: "085903", name: "Logica e Algebra", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABREC",
    track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Blocco B1 al secondo anno; obbligatorio per I3I, recuperabile al terzo anno con TABREC.",
    offerings: [
      { year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "B1", compulsory: false, category: "C", language: "IT" },
      { year: 3, semester: 1, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "093506", name: "Elettromagnetismo e Campi", year: 2, semester: 1, cfu: 10, type: ["B"], isElective: true, electiveGroup: "B1",
    track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Alternativa B del blocco B1; consigliata per chi sceglierà I3C.",
    offerings: [{ year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "B1", compulsory: false, category: "B", language: "IT" }],
  },
  {
    code: "085900", name: "Chimica Generale", year: 2, semester: 1, cfu: 5, type: ["A"], isElective: true, electiveGroup: "TABA",
    track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "TABA", compulsory: false, category: "A", language: "IT" },
      { year: 3, semester: 1, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D", language: "IT" },
    ],
  },
  { code: "058081", name: "Fisica Tecnica", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Numero chiuso." },
  { code: "058083", name: "Misure", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Numero chiuso." },
  { code: "058084", name: "Onde Elettromagnetiche e Mezzi Trasmissivi", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Numero chiuso." },

  // ---------------------------------------------------------------- ANNO 2 – blocco B2
  { code: "099319", name: "Probabilità e Statistica per l'Informatica", year: 2, semester: 2, cfu: 10, type: ["A"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "054304", linkedExams: [], isSoprannumero: false, description: "Alternativo a Informazione e Stima." },
  { code: "054304", name: "Informazione e Stima (per Ing. Informatica)", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "099319", linkedExams: [], isSoprannumero: false, description: "Alternativo a Probabilità e Statistica." },

  // ---------------------------------------------------------------- ANNO 2 – blocco B3
  {
    code: "086067", name: "Algoritmi e Principi dell'Informatica", year: 2, semester: 2, cfu: 10, type: ["A", "B"], isElective: true, electiveGroup: "TABREC",
    track: "I3I", isCompulsory: false, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "052509", name: "Prova Finale (Progetto Algoritmi e Strutture Dati)", cfu: 1, type: ["V"] }],
    description: "Obbligatorio per I3I. Se non scelto al 2° anno va recuperato al 3° tramite TABREC.",
    offerings: [
      { year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "B", linkedModules: ["052509"], language: "IT" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", linkedModules: ["052509"], language: "IT" },
    ],
  },
  {
    code: "052509", name: "Prova Finale (Progetto Algoritmi e Strutture Dati)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null,
    track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "086067",
    description: "Il Manifesto lo associa ad Algoritmi nel blocco B3 del secondo anno. La tabella TABREC del terzo anno elenca Algoritmi per 10 CFU senza il modulo: in caso di recupero va verificato sui Servizi Online.",
    offerings: [
      { year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "V" },
    ],
  },
  {
    code: "099322", name: "Segnali per le Comunicazioni", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "TABTLC",
    track: "both", isCompulsory: false, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "054440", name: "Prova Finale (Progetto Segnali per le Comunicazioni)", cfu: 1, type: ["V"] }],
    description: "Obbligatorio per I3C. Se non scelto al 2° anno va recuperato al 3° tramite TABCOM.",
    offerings: [
      { year: 2, semester: 2, tracks: ["I3C", "I3I"], group: "B3", compulsory: false, category: "B", linkedModules: ["054440"], language: "IT" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "054440", name: "Prova Finale (Progetto Segnali per le Comunicazioni)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null,
    track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "099322",
    offerings: [{ year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "V" }],
  },

  // ---------------------------------------------------------------- ANNO 3 – comune
  { code: "085746", name: "Fondamenti di Elettronica", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "both", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ---------------------------------------------------------------- ANNO 3 – I3I
  {
    code: "085877", name: "Reti Logiche", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "054441", name: "Prova Finale (Progetto di Reti Logiche)", cfu: 1, type: ["V"] }],
  },
  { code: "054441", name: "Prova Finale (Progetto di Reti Logiche)", year: 3, semester: 1, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "085877" },
  {
    code: "052510", name: "Ingegneria del Software", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "085923", name: "Prova Finale (Ingegneria del Software)", cfu: 3, type: ["V"] }],
  },
  {
    code: "085923", name: "Prova Finale (Ingegneria del Software)", year: 3, semester: 2, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "052510",
    offerings: [{ year: 3, semester: 2, tracks: ["I3I"], group: null, compulsory: false, category: "V" }],
  },

  // ANNO 3 – I3I bundle lingua (tutto italiano oppure tutto inglese)
  { code: "052511", name: "Sistemi Informativi (per il Settore dell'Informazione)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-IT", track: "I3I", isCompulsory: false, alternativeTo: "063149", linkedExams: [], isSoprannumero: false, description: "Bundle italiano di Sistemi Informativi, Basi di Dati ed Economia." },
  { code: "085887", name: "Basi di Dati 1", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-IT", track: "I3I", isCompulsory: false, alternativeTo: "063579", linkedExams: [], isSoprannumero: false, description: "Bundle italiano." },
  {
    code: "051289", name: "Economia e Organizzazione Aziendale", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: null, track: "both", isCompulsory: false, alternativeTo: "063150", linkedExams: [], isSoprannumero: false,
    description: "Bundle italiano per I3I; obbligatorio per I3C.",
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "I3I-LANG-IT", compulsory: false, category: "C", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: null, compulsory: true, category: "C", language: "IT" },
    ],
  },
  { code: "063149", name: "Information Systems", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "052511", linkedExams: [], isSoprannumero: false, description: "Bundle inglese, numero chiuso: la disponibilità posti non è verificabile offline." },
  { code: "063579", name: "Databases", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "085887", linkedExams: [], isSoprannumero: false, description: "Bundle inglese, numero chiuso." },
  { code: "063150", name: "Economics & Business Administration", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "051289", linkedExams: [], isSoprannumero: false, description: "Bundle inglese, numero chiuso." },

  // ANNO 3 – I3I – TABAUT
  { code: "088877", name: "Teoria dei Sistemi (Dinamica Non Lineare)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085901", name: "Automazione Industriale", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ANNO 3 – I3I – TABINF
  { code: "056889", name: "Foundations of Artificial Intelligence", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "059429", name: "Fondamenti di Human-Computer Interaction", year: 3, semester: 1, cfu: 5, type: ["A", "B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "052512", name: "Bioinformatics Algorithms", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "054221", name: "Fondamenti di Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089020", name: "Progetto di Ingegneria Informatica", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089013", name: "Robotics", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085879", name: "Tecnologie Informatiche per il Web", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ANNO 3 – I3I – TABING
  { code: "088805", name: "Fisica Tecnica", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "088804", name: "Meccanica (per Ing. Informatica)", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Consigliato: senza Meccanica può diventare un obbligo formativo in LM CSE." },

  // ANNO 3 – TABTLC / TABCOM
  {
    code: "054305", name: "Dispositivi per la Trasmissione dell'Informazione", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "059431", name: "Introduzione alle Tecnologie di Interconnessione", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "059430", name: "Problemi Inversi Applicati al Telerilevamento", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "051231", name: "Ottica e Immagini", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "051230", name: "Sicurezza delle Reti", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "051234", name: "Software Defined Networking", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "054442", name: "Prova Finale (Software Defined Networking)", cfu: 1, type: ["V"] }],
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "EN" },
      { year: 3, semester: 2, tracks: ["I3C"], group: null, compulsory: true, category: "B", linkedModules: ["054442"], language: "EN" },
    ],
  },

  // ANNO 3 – I3I – Tirocinio
  { code: "086369", name: "Tirocinio (Ing. Informatica) – 10 CFU", year: 3, semester: "A", cfu: 10, type: ["T"], isElective: true, electiveGroup: "TIROCINIO", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Non obbligatorio. Da 10 CFU può generare 5 CFU di obblighi aggiuntivi in LM CSE." },
  { code: "097654", name: "Tirocinio (Ing. Informatica) – 5 CFU", year: 3, semester: "A", cfu: 5, type: ["T"], isElective: true, electiveGroup: "TIROCINIO", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, description: "Non obbligatorio." },

  // ---------------------------------------------------------------- ANNO 3 – I3C
  { code: "093283", name: "Fondamenti di Elaborazione Numerica dei Segnali", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  {
    code: "097459", name: "Sistemi di Comunicazione", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", cfu: 3, type: ["V"] }],
  },
  { code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", year: 3, semester: 1, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "097459" },
  { code: "054442", name: "Prova Finale (Software Defined Networking)", year: 3, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "051234" },

  // ANNO 3 – I3C – TABGEN
  { code: "089180", name: "Numerical Analysis", year: 3, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "083049", linkedExams: [], isSoprannumero: false },
  { code: "083049", name: "Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "089180", linkedExams: [], isSoprannumero: false },
  { code: "088850", name: "Fisica Tecnica (I3C)", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
];

const ELECTIVE_GROUPS_2025_2026: Record<string, ElectiveGroup> = {
  B1: { label: "Blocco B1", description: "10 CFU: Logica e Algebra + un corso TABA, oppure Elettromagnetismo e Campi", maxPicks: null, minPicks: null, tracks: null },
  TABA: { label: "TABA", description: "Esattamente 1 corso da 5 CFU, insieme a Logica e Algebra", maxPicks: 1, minPicks: 1, tracks: null },
  PROBSTAT: { label: "Blocco B2", description: "Esattamente uno tra Probabilità e Statistica e Informazione e Stima", maxPicks: 1, minPicks: 1, tracks: null },
  TABREC: { label: "TABREC", description: "Recuperi obbligatori per I3I se non già acquisiti", maxPicks: null, minPicks: null, tracks: ["I3I"] },
  TABAUT: { label: "TABAUT", description: "Tabella automatica, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABINF: { label: "TABINF", description: "Tabella informatica, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABING: { label: "TABING", description: "Tabella affini ingegneristiche, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABTLC: { label: "TABTLC", description: "Tabella telecomunicazioni, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABCOM: { label: "TABCOM", description: "Tabella comunicazioni, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3C"] },
  TABGEN: { label: "TABGEN", description: "Tabella generali/affini, dentro i 15 CFU a scelta", maxPicks: null, minPicks: 0, tracks: ["I3C"] },
  TIROCINIO: { label: "Tirocinio", description: "Tirocinio facoltativo da 5 o 10 CFU, una sola istanza", maxPicks: 1, minPicks: 0, tracks: null },
  "I3I-LANG-IT": { label: "Bundle italiano", description: "Sistemi Informativi + Basi di Dati 1 + Economia", maxPicks: null, minPicks: null, tracks: ["I3I"] },
  "I3I-LANG-EN": { label: "Bundle inglese", description: "Information Systems + Databases + Economics (numero chiuso)", maxPicks: null, minPicks: null, tracks: ["I3I"] },
};

const RULES_2025_2026: PlanRule[] = [
  {
    kind: "required_all", id: "it1_year1", label: "Anno 1 IT1 – insegnamenti obbligatori", dueByYear: 1,
    codes: ["082740", "082746", "082747", "051124", "082748", "054303"],
    provenance: "manifesto",
    source: "§6.1 – IT1 anno 1, 60 CFU obbligatori",
  },
  {
    kind: "required_all", id: "it1_year2_fixed", label: "Anno 2 IT1 – insegnamenti obbligatori", dueByYear: 2,
    codes: ["052425", "085779", "085905"],
    provenance: "manifesto",
    source: "§6.2.1 – IT1 anno 2, corsi fissi",
  },
  {
    kind: "alternatives", id: "it1_year2_b1", label: "Anno 2 IT1 – blocco B1 (10 CFU)", dueByYear: 2,
    options: [
      { id: "b1_logica_taba", label: "Logica e Algebra + un corso TABA", requireAll: ["085903"], pickOneOf: { codes: TABA_CODES, count: 1 } },
      { id: "b1_campi", label: "Elettromagnetismo e Campi", requireAll: ["093506"] },
    ],
    provenance: "operational_to_verify",
    source: "§6.2.2 / §13.1 – blocco IT1-2Y-B1, ricostruzione dal Manifesto HTML da confrontare con l'export ufficiale",
  },
  {
    kind: "exactly_one", id: "it1_year2_b2", label: "Anno 2 IT1 – blocco B2 (10 CFU)", dueByYear: 2,
    codes: ["099319", "054304"],
    provenance: "manifesto",
    source: "§6.2.3 – blocco IT1-2Y-B2, esattamente uno tra i due",
  },
  {
    kind: "bundle_exactly_one", id: "it1_year2_b3", label: "Anno 2 IT1 – blocco B3 (11 CFU)", dueByYear: 2,
    bundles: [
      { id: "b3_informatica", label: "Algoritmi e Principi dell'Informatica + progetto", codes: ["086067", "052509"] },
      { id: "b3_comunicazioni", label: "Segnali per le Comunicazioni + progetto", codes: ["099322", "054440"] },
    ],
    provenance: "operational_to_verify",
    source: "§6.2.4 / §13.1 – blocco IT1-2Y-B3, ricostruzione dal Manifesto HTML da confrontare con l'export ufficiale",
  },
  {
    kind: "required_all", id: "i3i_year3_fixed", label: "Anno 3 I3I – insegnamenti obbligatori", dueByYear: 3, tracks: ["I3I"],
    codes: ["085746", "085877", "054441", "052510", "085923"],
    provenance: "manifesto",
    source: "§7.1 – I3I corsi fissi e moduli di prova finale",
  },
  {
    kind: "bundle_exactly_one", id: "i3i_language_bundle", label: "Anno 3 I3I – bundle lingua (18 CFU)", dueByYear: 3, tracks: ["I3I"],
    bundles: [
      { id: "lang_it", label: "Bundle italiano", codes: ["052511", "085887", "051289"] },
      { id: "lang_en", label: "Bundle inglese (numero chiuso)", codes: ["063149", "063579", "063150"] },
    ],
    provenance: "manifesto",
    source: "§7.2 – bundle lingua I3I: combinazioni miste italiano/inglese non ammesse",
  },
  {
    kind: "recovery_required", id: "i3i_recovery", label: "Anno 3 I3I – recuperi TABREC", dueByYear: 3, tracks: ["I3I"],
    codes: ["085903", "086067"],
    provenance: "manifesto",
    source: "§6.2.5 / §7.3 – per I3I, Logica e Algebra (5 CFU) e Algoritmi e Principi dell'Informatica (10 CFU) sono obbligatori: se non acquisiti al secondo anno vanno inseriti in TABREC, dentro il gruppo da 15 CFU",
  },
  {
    kind: "choice_cfu", id: "i3i_choice_15", label: "Anno 3 I3I – gruppo da 15 CFU", dueByYear: 3, tracks: ["I3I"],
    groups: ["TABREC", "TABAUT", "TABINF", "TABING", "TABTLC", "TIROCINIO"],
    requiredCfu: 15, countsExternal: true, completableInSecondSemesterWindow: true,
    provenance: "manifesto",
    source: "§7.3 – gruppo scelte/recuperi da 15 CFU selezionabile da TABREC, TABAUT, TABINF, TABING, TABTLC; i recuperi TABREC contribuiscono al totale",
  },
  {
    kind: "required_all", id: "i3c_year3_fixed", label: "Anno 3 I3C – insegnamenti obbligatori", dueByYear: 3, tracks: ["I3C"],
    codes: ["085746", "093283", "097459", "097460", "051234", "054442", "051289"],
    provenance: "manifesto",
    source: "§8.1 – I3C corsi fissi e moduli di prova finale",
  },
  {
    kind: "recovery_required", id: "i3c_recovery", label: "Anno 3 I3C – recupero Segnali", dueByYear: 3, tracks: ["I3C"],
    codes: ["099322"],
    provenance: "manifesto",
    source: "§8.2 – per I3C, Segnali per le Comunicazioni (10 CFU) va inserito in TABCOM se non già acquisito, dentro il gruppo da 15 CFU",
  },
  {
    kind: "choice_cfu", id: "i3c_choice_15", label: "Anno 3 I3C – gruppo da 15 CFU", dueByYear: 3, tracks: ["I3C"],
    groups: ["TABCOM", "TABGEN", "TIROCINIO"],
    requiredCfu: 15, countsExternal: true, completableInSecondSemesterWindow: true,
    provenance: "manifesto",
    source: "§8.2 – gruppo scelte/recuperi da 15 CFU selezionabile da TABCOM e TABGEN",
  },
  {
    kind: "linked_modules", id: "final_exam_modules", label: "Moduli di prova finale collegati",
    pairs: [
      // Associazioni e semestri come nelle tabelle del Manifesto.
      { parent: "086067", module: "052509", attestedGroups: ["B3"], semester: 2, note: "Nel Manifesto il progetto da 1 CFU è associato ad Algoritmi dentro il blocco B3 del secondo anno. La tabella TABREC del terzo anno elenca Algoritmi per 10 CFU e non riporta il modulo." },
      { parent: "099322", module: "054440", attestedGroups: ["B3"], semester: 2, note: "Nel Manifesto il progetto da 1 CFU è associato a Segnali dentro il blocco B3 del secondo anno. Le tabelle TABCOM/TABTLC del terzo anno elencano Segnali per 10 CFU e non riportano il modulo." },
      { parent: "085877", module: "054441", attestedGroups: null, semester: 1 },
      { parent: "052510", module: "085923", attestedGroups: null, semester: 2 },
      { parent: "097459", module: "097460", attestedGroups: null, semester: 1 },
      { parent: "051234", module: "054442", attestedGroups: null, semester: 2 },
    ],
    provenance: "manifesto",
    source: "§3.4 / §6.2.4 / §7.1 / §8.1 – la prova finale è composta da moduli collegati a insegnamenti progettuali",
  },
  {
    kind: "single_instance", id: "internship_single", label: "Tirocinio – una sola istanza",
    codes: ["086369", "097654"], maxSelected: 1,
    provenance: "manifesto",
    source: "§3.3 / §13.4 – una sola variante di tirocinio nel piano standard",
  },
  {
    kind: "advisory_any_of", id: "lm_cse_mechanics", label: "Obblighi LM Computer Science and Engineering",
    codes: ["088804"],
    message: "Senza Meccanica potresti ricevere un obbligo formativo in LM Computer Science and Engineering.",
    provenance: "manifesto",
    source: "§11.2 – obblighi/consigli LM CSE",
  },
  {
    kind: "advisory_any_of", id: "lm_cse_physics", label: "Obblighi LM Computer Science and Engineering",
    codes: ["085900", "058083", "058081", "058084", "093506", "088805", "088850"],
    message: "Senza almeno uno tra Chimica Generale, Misure, Fisica Tecnica, Onde Elettromagnetiche ed Elettromagnetismo e Campi potresti dover inserire Fisica Tecnica in LM CSE.",
    provenance: "manifesto",
    source: "§11.2 – obblighi/consigli LM CSE",
  },
];

const ANNUAL_RULES_2025_2026: AnnualRules = {
  cfuRange: [30, 80],
  rangeAppliesTo: "new_frequency_cfu",
  reinsertionsCountTowardRange: null,
  contributionMetric: "new_frequency_cfu",
  supernumeraryMaxCfu: 32,
  externalFreeChoiceMaxCfu: 15,
  frequencyImplyingExamStatuses: ["not_passed", "passed_unregistered"],
  settledExamStatuses: ["passed_registered", "not_required"],
  secondSemesterRevision: { editableSemester: 2, allowTrackChange: false, allowSelfCertification: false },
  sources: {
    cfuRange: "§2.1.5 – in presentazione ordinaria il piano può contenere da 30 a 80 CFU per anno",
    reinsertions: "§2.2.1 – gli esami non superati dei piani precedenti vanno reinseriti prima delle nuove frequenze",
    contribution: "§2.2.3 – se l'esame è superato al recupero, l'insegnamento esce dalle nuove frequenze e non conta per le tasse",
    supernumerary: "§2.1.7 / §3.5 – massimo 32 CFU soprannumerari sull'intera durata del corso",
    externalChoices: "§2.3.1 – scelte autonome ammesse fino a 15 CFU",
    revision: "§2.4 – modifiche facoltative limitate agli insegnamenti del secondo semestre",
  },
};

const DEGREE_RULES_2025_2026: DegreeRules = {
  totalCfu: 180,
  categoryMinimums: { A: 50, B: 60, C: 18 },
  freeChoiceCfuRange: [12, 18],
  finalExamCfu: 5,
  baseAreaRules: {
    math_info_stats: { label: "Matematica, informatica e statistica", min: 38, max: 50 },
    physics_chemistry: { label: "Fisica e chimica", min: 12, max: 33 },
  },
  baseTotalCfuRange: [50, 83],
  characterizingAreaRules: {
    electronics: { label: "Ingegneria elettronica", min: 10, max: 20 },
    computer_engineering: { label: "Ingegneria informatica", min: 20, max: 60 },
    telecommunications: { label: "Ingegneria delle telecomunicazioni", min: 10, max: 60 },
  },
  characterizingTotalCfuRange: [60, 92],
  sources: {
    totalCfu: "§3.1 – 180 CFU per conseguire il titolo",
    areas: "§3.2 – vincoli SSD ministeriali",
    finalExam: "§3.4 – la prova finale vale complessivamente 5 CFU",
  },
};

const AREA_BY_CODE_2025_2026: Record<string, AreaMapping> = {
  "082740": { kind: "base", area: "math_info_stats" },
  "082747": { kind: "base", area: "math_info_stats" },
  "052425": { kind: "base", area: "math_info_stats" },
  "085903": { kind: "base", area: "math_info_stats" },
  "099319": { kind: "base", area: "math_info_stats" },
  "051124": { kind: "base", area: "physics_chemistry" },
  "085900": { kind: "base", area: "physics_chemistry" },

  "085746": { kind: "characterizing", area: "electronics" },
  "082746": { kind: "characterizing", area: "computer_engineering" },
  "085779": { kind: "characterizing", area: "computer_engineering" },
  "086067": { kind: "characterizing", area: "computer_engineering" },
  "052511": { kind: "characterizing", area: "computer_engineering" },
  "085887": { kind: "characterizing", area: "computer_engineering" },
  "085877": { kind: "characterizing", area: "computer_engineering" },
  "052510": { kind: "characterizing", area: "computer_engineering" },
  "063149": { kind: "characterizing", area: "computer_engineering" },
  "063579": { kind: "characterizing", area: "computer_engineering" },
  "093283": { kind: "characterizing", area: "telecommunications" },
  "097459": { kind: "characterizing", area: "telecommunications" },
  "054303": { kind: "characterizing", area: "telecommunications" },
  "054304": { kind: "characterizing", area: "telecommunications" },
  "099322": { kind: "characterizing", area: "telecommunications" },
  "093506": { kind: "characterizing", area: "telecommunications" },
  "058083": { kind: "characterizing", area: "telecommunications" },
  "058084": { kind: "characterizing", area: "telecommunications" },
  "054305": { kind: "characterizing", area: "telecommunications" },
  "051231": { kind: "characterizing", area: "telecommunications" },
  "051230": { kind: "characterizing", area: "telecommunications" },
  "051234": { kind: "characterizing", area: "telecommunications" },
};

const ACTIVITY_OVERRIDES_2025_2026: Record<string, ActivityCategory> = {
  "082746": "B",
  "085779": "B",
  "086067": "B",
  "099322": "B",
};

const DEFAULT_NEW_FREQUENCIES_2025_2026: Record<Track, Record<1 | 2 | 3, string[]>> = {
  I3I: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    2: ["052425", "085779", "085905", "085903", "058083", "099319", "086067", "052509"],
    3: ["085746", "052511", "085887", "051289", "085877", "054441", "052510", "085923", "056889", "088804", "085901"],
  },
  I3C: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    2: ["052425", "085779", "085905", "093506", "099319", "099322", "054440"],
    3: ["085746", "093283", "097459", "097460", "051234", "054442", "051289", "054305", "059431", "085900"],
  },
};

export const CATALOG_2025_2026: Catalog = {
  academicYear: "2025/2026",
  courseCode: "531",
  dataStatus: "verified_from_manifesto",
  dataNotes: [
    "La struttura dei blocchi B1/B2/B3 del secondo anno IT1 è una ricostruzione coerente con il Manifesto HTML: da confrontare con un export ufficiale machine-readable (§13.1).",
    "La disponibilità di posti dei corsi a numero chiuso (bundle inglese I3I, TABA a numero chiuso) non è verificabile offline (§13.3).",
    "Fondamenti di Automatica (ING-INF/04) non compare negli ambiti caratterizzanti ministeriali elencati nel Regolamento: il conteggio per area lo esclude.",
    "Le tabelle di recupero del terzo anno elencano Algoritmi (10 CFU) e Segnali (10 CFU) senza i rispettivi moduli di progetto da 1 CFU: se recuperi quei corsi, verifica sui Servizi Online se il modulo va reinserito.",
    "Le finestre di presentazione e di modifica del piano non sono nel Manifesto: quando il gruppo da 15 CFU può essere completato è una regola operativa da verificare sui Servizi Online.",
  ],
  sources: [
    "Manifesto/Regolamento didattico AA 2025/2026, corso 531 (onlineservices.polimi.it)",
    "polimi_ingegneria_informatica_piano_studi_regole.md",
  ],
  courses: COURSES_2025_2026,
  electiveGroups: ELECTIVE_GROUPS_2025_2026,
  rules: RULES_2025_2026,
  annual: ANNUAL_RULES_2025_2026,
  degree: DEGREE_RULES_2025_2026,
  defaultNewFrequencies: DEFAULT_NEW_FREQUENCIES_2025_2026,
  areaByCode: AREA_BY_CODE_2025_2026,
  activityCategoryOverrides: ACTIVITY_OVERRIDES_2025_2026,
  freeChoiceGroups: ["TABAUT", "TABINF", "TABING", "TABTLC", "TABCOM", "TABGEN", "TIROCINIO"],
};
