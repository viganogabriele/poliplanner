/**
 * Catalogo e regole AA 2026/2027 – Ingegneria Informatica 531, Milano Leonardo in presenza.
 *
 * Fonte: Regolamento didattico del corso 531 per l'AA 2026/27 pubblicato sui Servizi Online,
 * consultato il 2026-08-17. Il documento è una **bozza informativa**: l'ateneo lo pubblica con
 * l'avviso «questa è una Bozza Informativa del regolamento didattico e pertanto potrebbe subire
 * delle modifiche fino all'approvazione definitiva da parte del Senato Accademico».
 *
 * Corsi, CFU, semestri e composizione delle tabelle sono quindi **trascritti da un documento
 * ufficiale esistente**, non derivati dall'anno precedente e non inventati. Restano marcati
 * `to_verify` perché la bozza può cambiare, non perché il Manifesto manchi.
 */

import type {
  AnnualRules,
  AreaMapping,
  Catalog,
  Course,
  DegreeRules,
  ElectiveGroup,
  PlanRule,
} from "./types";
import type { ActivityCategory, Track } from "../constraints";

const SOURCE_URL =
  "https://onlineservices.polimi.it/manifesti/manifesti/controller/extra/RegolamentoPublic.do?EVN_DEFAULT=evento&aa=2026&jaf_currentWFID=main&k_corso_la=531&lang=IT";
const RETRIEVED_ON = "2026-08-17";

const DRAFT = "Regolamento 531 AA 2026/27 (bozza informativa)";

const TABA_CODES = ["085900", "058081", "058083", "058084"];

export const COURSES_2026_2027: Course[] = [
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

  // ---------------------------------------------------------------- ANNO 2 – blocco B1 (10 CFU)
  {
    code: "085903", name: "Logica e Algebra", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABREC",
    track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Obbligatorio per I3I. Se non lo scegli al secondo anno lo scegli al terzo nella tabella dei recuperi.",
    offerings: [
      { year: 2, semester: 1, tracks: ["I3I", "I3C"], group: "B1", compulsory: false, category: "C", language: "IT" },
      { year: 3, semester: 1, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "093506", name: "Elettromagnetismo e Campi", year: 2, semester: 1, cfu: 10, type: ["B"], isElective: true, electiveGroup: "B1",
    track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Alternativa da 10 CFU al blocco Logica e Algebra + tabella di area di base; consigliata per chi sceglierà I3C.",
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
  { code: "058081", name: "Fisica Tecnica", year: 2, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, enrolmentCapped: true },
  { code: "058083", name: "Misure", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, enrolmentCapped: true },
  { code: "058084", name: "Onde Elettromagnetiche e Mezzi Trasmissivi", year: 2, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABA", track: null, isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ---------------------------------------------------------------- ANNO 2 – blocco B2 (10 CFU)
  { code: "099319", name: "Probabilità e Statistica per l'Informatica", year: 2, semester: 2, cfu: 10, type: ["A"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "054304", linkedExams: [], isSoprannumero: false, description: "Alternativo a Informazione e Stima; la scelta non vincola quelle successive." },
  { code: "054304", name: "Informazione e Stima (per Ing. Informatica)", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "PROBSTAT", track: null, isCompulsory: false, alternativeTo: "099319", linkedExams: [], isSoprannumero: false, description: "Alternativo a Probabilità e Statistica; la scelta non vincola quelle successive." },

  // ---------------------------------------------------------------- ANNO 2 – blocco B3 (11 CFU)
  {
    code: "086067", name: "Algoritmi e Principi dell'Informatica", year: 2, semester: 2, cfu: 10, type: ["A", "B"], isElective: true, electiveGroup: "TABREC",
    track: "I3I", isCompulsory: false, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "052509", name: "Prova Finale (Progetto di Algoritmi e Strutture Dati)", cfu: 1, type: ["V"] }],
    description: "Obbligatorio per I3I. Se non lo scegli al secondo anno lo scegli al terzo nella tabella dei recuperi.",
    offerings: [
      { year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "B", linkedModules: ["052509"], language: "IT" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABREC", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "052509", name: "Prova Finale (Progetto di Algoritmi e Strutture Dati)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null,
    track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "086067",
    description: "Il Regolamento lo associa ad Algoritmi dentro il blocco da 11 CFU del secondo anno. La tabella dei recuperi del terzo anno elenca Algoritmi per 10 CFU senza il modulo: in quel caso va verificato sui Servizi Online.",
    offerings: [{ year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "V" }],
  },
  {
    code: "099322", name: "Segnali per le Comunicazioni", year: 2, semester: 2, cfu: 10, type: ["B"], isElective: true, electiveGroup: "TABCOM",
    track: "both", isCompulsory: false, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "054440", name: "Prova Finale (Progetto di Segnali per le Comunicazioni)", cfu: 1, type: ["V"] }],
    description: "Obbligatorio per I3C. Se non lo scegli al secondo anno lo scegli al terzo nella tabella di comunicazioni.",
    offerings: [
      { year: 2, semester: 2, tracks: ["I3C", "I3I"], group: "B3", compulsory: false, category: "B", linkedModules: ["054440"], language: "IT" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABTLC", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABCOM", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "054440", name: "Prova Finale (Progetto di Segnali per le Comunicazioni)", year: 2, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null,
    track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "099322",
    description: "Il Regolamento lo associa a Segnali dentro il blocco da 11 CFU del secondo anno. Le tabelle del terzo anno elencano Segnali per 10 CFU senza il modulo.",
    offerings: [{ year: 2, semester: 2, tracks: ["I3I", "I3C"], group: "B3", compulsory: false, category: "V" }],
  },

  // ---------------------------------------------------------------- ANNO 3 – comune
  { code: "085746", name: "Fondamenti di Elettronica", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "both", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ---------------------------------------------------------------- ANNO 3 – I3I fissi
  {
    code: "085877", name: "Reti Logiche", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "054441", name: "Prova Finale (Progetto di Reti Logiche)", cfu: 1, type: ["V"] }],
    description: "Blocco da 6 CFU con il modulo di prova finale collegato.",
  },
  { code: "054441", name: "Prova Finale (Progetto di Reti Logiche)", year: 3, semester: 1, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "085877" },
  {
    code: "052510", name: "Ingegneria del Software", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "085923", name: "Prova Finale (Ingegneria del Software)", cfu: 3, type: ["V"] }],
    description: "Blocco da 10 CFU con il modulo di prova finale collegato da 3 CFU.",
  },
  {
    code: "085923", name: "Prova Finale (Ingegneria del Software)", year: 3, semester: 2, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "052510",
    offerings: [{ year: 3, semester: 2, tracks: ["I3I"], group: null, compulsory: false, category: "V" }],
  },

  // ANNO 3 – I3I – blocco da 18 CFU, tutto in italiano oppure tutto in inglese
  { code: "052511", name: "Sistemi Informativi (per il Settore dell'Informazione)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-IT", track: "I3I", isCompulsory: false, alternativeTo: "063149", linkedExams: [], isSoprannumero: false, description: "Blocco da 18 CFU in italiano: Sistemi Informativi, Basi di Dati 1 ed Economia." },
  { code: "085887", name: "Basi di Dati 1", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-IT", track: "I3I", isCompulsory: false, alternativeTo: "063579", linkedExams: [], isSoprannumero: false, description: "Blocco da 18 CFU in italiano." },
  {
    code: "051289", name: "Economia e Organizzazione Aziendale", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: null, track: "both", isCompulsory: false, alternativeTo: "063150", linkedExams: [], isSoprannumero: false,
    description: "Per I3I fa parte del blocco da 18 CFU in italiano; per I3C è obbligatorio.",
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "I3I-LANG-IT", compulsory: false, category: "C", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: null, compulsory: true, category: "C", language: "IT" },
    ],
  },
  { code: "063149", name: "Information Systems", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "052511", linkedExams: [], isSoprannumero: false, enrolmentCapped: true, description: "Blocco da 18 CFU in inglese: sceglierne uno obbliga a scegliere anche gli altri due." },
  { code: "063579", name: "Databases", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "085887", linkedExams: [], isSoprannumero: false, enrolmentCapped: true, description: "Blocco da 18 CFU in inglese." },
  { code: "063150", name: "Economics & Business Administration", year: 3, semester: 2, cfu: 8, type: ["C"], isElective: false, electiveGroup: "I3I-LANG-EN", track: "I3I", isCompulsory: false, alternativeTo: "051289", linkedExams: [], isSoprannumero: false, enrolmentCapped: true, description: "Blocco da 18 CFU in inglese." },

  // ANNO 3 – I3I – tabella di automatica
  { code: "088877", name: "Teoria dei Sistemi (Dinamica Non Lineare)", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085901", name: "Automazione Industriale", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABAUT", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ANNO 3 – I3I – tabella di informatica
  { code: "059429", name: "Fondamenti di Human-Computer Interaction", year: 3, semester: 1, cfu: 5, type: ["A", "B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "056889", name: "Foundations of Artificial Intelligence", year: 3, semester: 1, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "052512", name: "Bioinformatics Algorithms", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "054221", name: "Fondamenti di Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089020", name: "Progetto di Ingegneria Informatica (5 CFU)", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "089013", name: "Robotics", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  { code: "085879", name: "Tecnologie Informatiche per il Web", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABINF", track: "I3I", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false },

  // ANNO 3 – tirocinio facoltativo: nella tabella di informatica per I3I, in quella di area
  // generale per I3C. Il Regolamento lo elenca sia al primo sia al secondo semestre.
  {
    code: "086369", name: "Tirocinio (Ing. Informatica) – 10 CFU", year: 3, semester: "A", cfu: 10, type: ["T"], isElective: true, electiveGroup: "TABINF",
    track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Facoltativo, dentro le attività a scelta. La variante da 10 CFU comporta 5 CFU di obblighi aggiuntivi all'ingresso in LM Computer Science and Engineering.",
    offerings: [
      { year: 3, semester: 1, tracks: ["I3I"], group: "TABINF", compulsory: false, category: "D" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABINF", compulsory: false, category: "D" },
      { year: 3, semester: 1, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D" },
    ],
  },
  {
    code: "097654", name: "Tirocinio (Ing. Informatica) – 5 CFU", year: 3, semester: "A", cfu: 5, type: ["T"], isElective: true, electiveGroup: "TABINF",
    track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Facoltativo, dentro le attività a scelta. È la variante consigliata a chi vuole proseguire con la Laurea Magistrale.",
    offerings: [
      { year: 3, semester: 1, tracks: ["I3I"], group: "TABINF", compulsory: false, category: "D" },
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABINF", compulsory: false, category: "D" },
      { year: 3, semester: 1, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D" },
    ],
  },

  // ANNO 3 – tabella di ingegneria affine (I3I) e di area generale (I3C)
  {
    code: "088805", name: "Fisica Tecnica (3° anno)", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Copre l'obbligo di Fisica Tecnica per l'accesso a LM Computer Science and Engineering.",
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABING", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D", language: "IT" },
    ],
  },
  {
    code: "088804", name: "Meccanica (per Ing. Informatica)", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABING", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
    description: "Consigliato: senza Meccanica l'insegnamento diventa un obbligo in LM Computer Science and Engineering.",
    offerings: [
      { year: 3, semester: 2, tracks: ["I3I"], group: "TABING", compulsory: false, category: "D", language: "IT" },
      { year: 3, semester: 2, tracks: ["I3C"], group: "TABGEN", compulsory: false, category: "D", language: "IT" },
    ],
  },

  // ANNO 3 – tabella di telecomunicazioni (I3I) e di comunicazioni (I3C)
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
    code: "051231", name: "Ottica e Immagini", year: 3, semester: 2, cfu: 5, type: ["B"], isElective: true, electiveGroup: "TABTLC", track: "both", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false,
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

  // ---------------------------------------------------------------- ANNO 3 – I3C fissi
  { code: "093283", name: "Fondamenti di Elaborazione Numerica dei Segnali", year: 3, semester: 1, cfu: 10, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, linkedExams: [], isSoprannumero: false },
  {
    code: "097459", name: "Sistemi di Comunicazione", year: 3, semester: 1, cfu: 7, type: ["B"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: true, alternativeTo: null, isSoprannumero: false,
    linkedExams: [{ code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", cfu: 3, type: ["V"] }],
    description: "Blocco da 10 CFU con il modulo di prova finale collegato da 3 CFU.",
  },
  { code: "097460", name: "Prova Finale (Sistemi di Comunicazione)", year: 3, semester: 1, cfu: 3, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "097459" },
  { code: "054442", name: "Prova Finale (Software Defined Networking)", year: 3, semester: 2, cfu: 1, type: ["V"], isElective: false, electiveGroup: null, track: "I3C", isCompulsory: false, alternativeTo: null, linkedExams: [], isSoprannumero: false, isLinkedExam: true, parentCode: "051234" },

  // ANNO 3 – I3C – tabella di area generale
  { code: "089180", name: "Numerical Analysis", year: 3, semester: 1, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "083049", linkedExams: [], isSoprannumero: false },
  { code: "083049", name: "Calcolo Numerico", year: 3, semester: 2, cfu: 5, type: ["C"], isElective: true, electiveGroup: "TABGEN", track: "I3C", isCompulsory: false, alternativeTo: "089180", linkedExams: [], isSoprannumero: false, description: "Consigliato a chi punta alla Laurea Magistrale in High Performance Computing Engineering." },
];

/**
 * Le `label` sono i nomi che la UI mostra. La sigla del Regolamento resta tra parentesi perché
 * serve per ritrovare la tabella sui Servizi Online, ma non compare mai da sola.
 */
const ELECTIVE_GROUPS_2026_2027: Record<string, ElectiveGroup> = {
  B1: { label: "Blocco del 2° anno da 10 CFU (B1)", description: "10 CFU: Logica e Algebra più un corso della tabella di area di base, oppure Elettromagnetismo e Campi", maxPicks: null, minPicks: null, tracks: null },
  TABA: { label: "Tabella di area di base del 2° anno (TABA)", description: "Esattamente 1 corso da 5 CFU, insieme a Logica e Algebra", maxPicks: 1, minPicks: 1, tracks: null },
  PROBSTAT: { label: "Blocco del 2° anno da 10 CFU (B2)", description: "Esattamente uno tra Probabilità e Statistica e Informazione e Stima", maxPicks: 1, minPicks: 1, tracks: null },
  B3: { label: "Blocco progettuale del 2° anno da 11 CFU (B3)", description: "Un insegnamento da 10 CFU con il modulo di prova finale collegato da 1 CFU", maxPicks: null, minPicks: null, tracks: null },
  TABREC: { label: "Tabella dei recuperi obbligatori (TABREC)", description: "Logica e Algebra e Algoritmi e Principi dell'Informatica: se non li scegli al 2° anno li scegli qui al 3°", maxPicks: null, minPicks: null, tracks: ["I3I"] },
  TABAUT: { label: "Tabella di automatica (TABAUT)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABINF: { label: "Tabella di informatica (TABINF)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno; contiene anche il tirocinio", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABING: { label: "Tabella di ingegneria affine (TABING)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABTLC: { label: "Tabella di telecomunicazioni (TABTLC)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno", maxPicks: null, minPicks: 0, tracks: ["I3I"] },
  TABCOM: { label: "Tabella di comunicazioni (TABCOM)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno", maxPicks: null, minPicks: 0, tracks: ["I3C"] },
  TABGEN: { label: "Tabella di area generale (TABGEN)", description: "Insegnamenti a scelta dentro il gruppo da 15 CFU del 3° anno; contiene anche il tirocinio", maxPicks: null, minPicks: 0, tracks: ["I3C"] },
  "I3I-LANG-IT": { label: "Blocco da 18 CFU in italiano", description: "Sistemi Informativi, Basi di Dati 1 ed Economia e Organizzazione Aziendale", maxPicks: null, minPicks: null, tracks: ["I3I"] },
  "I3I-LANG-EN": { label: "Blocco da 18 CFU in inglese", description: "Information Systems, Databases ed Economics & Business Administration: tutti e tre a numero chiuso", maxPicks: null, minPicks: null, tracks: ["I3I"] },
};

const RULES_2026_2027: PlanRule[] = [
  {
    kind: "required_all", id: "it1_year1", label: "Anno 1 IT1 – insegnamenti obbligatori", dueByYear: 1,
    codes: ["082740", "082746", "082747", "051124", "082748", "054303"],
    provenance: "manifesto",
    source: `${DRAFT} – tabella «Insegnamenti del 1° Anno di corso, piano IT1»: 60 CFU obbligatori`,
  },
  {
    kind: "required_all", id: "it1_year2_fixed", label: "Anno 2 IT1 – insegnamenti obbligatori", dueByYear: 2,
    codes: ["052425", "085779", "085905"],
    provenance: "manifesto",
    source: `${DRAFT} – tabella «Insegnamenti del 2° Anno di corso, piano IT1»: Analisi Matematica 2, Architettura dei Calcolatori e Sistemi Operativi, Fondamenti di Automatica`,
  },
  {
    kind: "alternatives", id: "it1_year2_b1", label: "Anno 2 IT1 – blocco da 10 CFU", dueByYear: 2,
    options: [
      { id: "b1_logica_taba", label: "Logica e Algebra più un corso della tabella di area di base", requireAll: ["085903"], pickOneOf: { codes: TABA_CODES, count: 1 } },
      { id: "b1_campi", label: "Elettromagnetismo e Campi", requireAll: ["093506"] },
    ],
    provenance: "operational_to_verify",
    source: `${DRAFT} – la colonna «CFU Gruppo» attesta 10 CFU su Logica e Algebra, tabella di area di base ed Elettromagnetismo e Campi; la composizione delle alternative è dedotta dal raggruppamento HTML e va confrontata con l'export ufficiale`,
  },
  {
    kind: "exactly_one", id: "it1_year2_b2", label: "Anno 2 IT1 – blocco da 10 CFU tra probabilità e stima", dueByYear: 2,
    codes: ["099319", "054304"],
    provenance: "manifesto",
    source: `${DRAFT} – note al 2° anno: «La scelta tra i corsi PROBABILITÀ E STATISTICA PER L'INFORMATICA e INFORMAZIONE E STIMA è lasciata allo studente e non vincola scelte successive»`,
  },
  {
    kind: "bundle_exactly_one", id: "it1_year2_b3", label: "Anno 2 IT1 – blocco progettuale da 11 CFU", dueByYear: 2,
    bundles: [
      { id: "b3_informatica", label: "Algoritmi e Principi dell'Informatica con il progetto collegato", codes: ["086067", "052509"] },
      { id: "b3_comunicazioni", label: "Segnali per le Comunicazioni con il progetto collegato", codes: ["099322", "054440"] },
    ],
    provenance: "operational_to_verify",
    source: `${DRAFT} – la colonna «CFU Gruppo» attesta 11 CFU su Segnali + progetto e Algoritmi + progetto; che le due coppie siano alternative è dedotto dal raggruppamento HTML`,
  },
  {
    kind: "required_all", id: "i3i_year3_fixed", label: "Anno 3 I3I – insegnamenti obbligatori", dueByYear: 3, tracks: ["I3I"],
    codes: ["085746", "085877", "054441", "052510", "085923"],
    provenance: "manifesto",
    source: `${DRAFT} – tabella «Insegnamenti del 3° Anno di corso, piano I3I - Informatica»`,
  },
  {
    kind: "bundle_exactly_one", id: "i3i_language_bundle", label: "Anno 3 I3I – blocco da 18 CFU, italiano o inglese", dueByYear: 3, tracks: ["I3I"],
    bundles: [
      { id: "lang_it", label: "Blocco in italiano", codes: ["052511", "085887", "051289"] },
      { id: "lang_en", label: "Blocco in inglese (numero chiuso)", codes: ["063149", "063579", "063150"] },
    ],
    provenance: "manifesto",
    source: `${DRAFT} – «La selezione di uno dei corsi in lingua inglese implica che anche gli altri due corsi dovranno essere selezionati in lingua inglese»`,
  },
  {
    kind: "recovery_required", id: "i3i_recovery", label: "Anno 3 I3I – insegnamenti obbligatori da scegliere in TABREC", dueByYear: 3, tracks: ["I3I"],
    codes: ["085903", "086067"],
    // Sceglierli nella tabella dei recuperi assolve i blocchi del secondo anno che li contenevano.
    dischargesRuleIds: ["it1_year2_b1", "it1_year2_b3"],
    provenance: "manifesto",
    source: `${DRAFT} – note al 2° anno: «Il corso di LOGICA E ALGEBRA è obbligatorio per chi sceglie l'indirizzo I3I - Informatica. Se non scelto al secondo anno deve essere scelto al terzo anno (TABREC)» e identica formulazione per ALGORITMI E PRINCIPI DELL'INFORMATICA`,
  },
  {
    kind: "choice_cfu", id: "i3i_choice_15", label: "Anno 3 I3I – gruppo da 15 CFU a scelta", dueByYear: 3, tracks: ["I3I"],
    groups: ["TABREC", "TABAUT", "TABINF", "TABING", "TABTLC"],
    requiredCfu: 15, countsExternal: true, completableInSecondSemesterWindow: true,
    provenance: "manifesto",
    source: `${DRAFT} – tabella del 3° anno I3I: «Insegnamenti a scelta dal Gruppo TABREC / TABAUT / TABINF / TABING / TABTLC», colonna «CFU Gruppo» 15,0`,
  },
  {
    kind: "required_all", id: "i3c_year3_fixed", label: "Anno 3 I3C – insegnamenti obbligatori", dueByYear: 3, tracks: ["I3C"],
    codes: ["085746", "093283", "097459", "097460", "051234", "054442", "051289"],
    provenance: "manifesto",
    source: `${DRAFT} – tabella «Insegnamenti del 3° Anno di corso, piano I3C - Comunicazioni»`,
  },
  {
    kind: "recovery_required", id: "i3c_recovery", label: "Anno 3 I3C – insegnamento obbligatorio da scegliere in TABCOM", dueByYear: 3, tracks: ["I3C"],
    codes: ["099322"],
    dischargesRuleIds: ["it1_year2_b3"],
    provenance: "manifesto",
    source: `${DRAFT} – note al 2° anno: «Il corso di SEGNALI PER LE COMUNICAZIONI è obbligatorio per chi sceglie l'indirizzo I3C - Comunicazioni. Se non scelto al secondo anno deve essere scelto al terzo anno (TABCOM)»`,
  },
  {
    kind: "choice_cfu", id: "i3c_choice_15", label: "Anno 3 I3C – gruppo da 15 CFU a scelta", dueByYear: 3, tracks: ["I3C"],
    groups: ["TABCOM", "TABGEN"],
    requiredCfu: 15, countsExternal: true, completableInSecondSemesterWindow: true,
    provenance: "manifesto",
    source: `${DRAFT} – tabella del 3° anno I3C: «Insegnamenti a scelta dal Gruppo TABCOM / TABGEN», colonna «CFU Gruppo» 15,0`,
  },
  {
    kind: "linked_modules", id: "final_exam_modules", label: "Moduli di prova finale collegati",
    pairs: [
      { parent: "086067", module: "052509", attestedGroups: ["B3"], semester: 2, note: "Nel Regolamento il progetto da 1 CFU è associato ad Algoritmi dentro il blocco da 11 CFU del secondo anno. La tabella TABREC del terzo anno elenca Algoritmi per 10 CFU e non riporta il modulo." },
      { parent: "099322", module: "054440", attestedGroups: ["B3"], semester: 2, note: "Nel Regolamento il progetto da 1 CFU è associato a Segnali dentro il blocco da 11 CFU del secondo anno. Le tabelle TABCOM/TABTLC del terzo anno elencano Segnali per 10 CFU e non riportano il modulo." },
      { parent: "085877", module: "054441", attestedGroups: null, semester: 1 },
      { parent: "052510", module: "085923", attestedGroups: null, semester: 2 },
      { parent: "097459", module: "097460", attestedGroups: null, semester: 1 },
      { parent: "051234", module: "054442", attestedGroups: null, semester: 2 },
    ],
    provenance: "manifesto",
    source: `${DRAFT} – «Il corso di prova finale è obbligatorio per tutti gli studenti»; i moduli sono elencati accanto all'insegnamento progettuale con la stessa colonna «CFU Gruppo»`,
  },
  {
    kind: "single_instance", id: "internship_single", label: "Tirocinio – una sola istanza",
    codes: ["086369", "097654"], maxSelected: 1,
    provenance: "manifesto",
    source: `${DRAFT} – «Il tirocinio non è obbligatorio e può essere inserito, per 5 o 10 CFU, fra le attività a scelta dello studente»: una sola variante`,
  },
  {
    kind: "advisory_any_of", id: "lm_cse_mechanics", label: "Obblighi LM Computer Science and Engineering",
    codes: ["088804"],
    message: "Senza Meccanica dovrai sostenerla obbligatoriamente durante la Laurea Magistrale in Computer Science and Engineering.",
    provenance: "manifesto",
    source: `${DRAFT} – «lo studente che non sostenga durante la Laurea di primo livello l'insegnamento di Meccanica, dovrà obbligatoriamente sostenerlo durante la Laurea Magistrale»`,
  },
  {
    kind: "advisory_any_of", id: "lm_cse_physics", label: "Obblighi LM Computer Science and Engineering",
    codes: ["085900", "058083", "058081", "058084", "093506", "088805"],
    message: "Senza almeno uno tra Chimica Generale, Misure, Fisica Tecnica, Onde Elettromagnetiche ed Elettromagnetismo e Campi dovrai superare Fisica Tecnica durante la Laurea Magistrale in Computer Science and Engineering.",
    provenance: "manifesto",
    source: `${DRAFT} – «lo studente che non sostenga [...] uno a scelta tra i seguenti insegnamenti: Chimica generale, Misure, Fisica tecnica, Onde elettromagnetiche e mezzi trasmissivi, Elettromagnetismo e campi, dovrà obbligatoriamente superare l'insegnamento di Fisica tecnica durante la Laurea Magistrale»`,
  },
  {
    kind: "advisory_any_of", id: "lm_hpc_numerical", label: "Consigli LM High Performance Computing Engineering",
    codes: ["054221", "083049", "089180"],
    message: "Per la Laurea Magistrale in High Performance Computing Engineering il Regolamento consiglia Calcolo Numerico e Fondamenti di Ricerca Operativa. Nelle tabelle del terzo anno compaiono solo i corsi di calcolo numerico: Fondamenti di Ricerca Operativa non è elencato, quindi verifica sui Servizi Online come inserirlo.",
    provenance: "operational_to_verify",
    source: `${DRAFT} – «si suggerisce di inserire gli insegnamenti a scelta di Calcolo Numerico (5 CFU) e Fondamenti di Ricerca Operativa (5 CFU)»; la corrispondenza con i codici delle tabelle non è esplicitata dal documento`,
  },
];

const ANNUAL_RULES_2026_2027: AnnualRules = {
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
    cfuRange: {
      source: "§2.1.5 – in presentazione ordinaria il piano può contenere da 30 a 80 CFU per anno (norme di presentazione del piano degli studi, non Regolamento del corso 531)",
      provenance: "operational_to_verify",
    },
    reinsertions: {
      source: "§2.2.1 – gli esami non superati dei piani precedenti vanno reinseriti prima delle nuove frequenze",
      provenance: "operational_to_verify",
    },
    contribution: {
      source: "§2.2.3 – se l'esame è superato al recupero, l'insegnamento esce dalle nuove frequenze e non conta per le tasse",
      provenance: "operational_to_verify",
    },
    supernumerary: {
      source: `${DRAFT} – «l'eventuale inserimento in soprannumero nei piani degli studi di insegnamenti propri dei Corsi di Laurea Magistrale, consentito fino ad un massimo di 32 CFU»`,
      provenance: "manifesto",
    },
    externalChoices: {
      source: "§2.3.1 – scelte autonome fuori dalle tabelle preapprovate ammesse fino a 15 CFU",
      provenance: "operational_to_verify",
    },
    revision: {
      source: "§2.4 – modifiche facoltative limitate agli insegnamenti del secondo semestre",
      provenance: "operational_to_verify",
    },
  },
};

const DEGREE_RULES_2026_2027: DegreeRules = {
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
    totalCfu: `${DRAFT} – «Per il conseguimento del titolo è richiesta l'acquisizione dei 180 crediti [...] attività di base almeno 50 CFU, caratterizzanti almeno 60 CFU, integrative ed affini almeno 18 CFU, attività a scelta dello studente fra i 12 e i 18 CFU»`,
    areas: `${DRAFT} – vincoli sui settori scientifico-disciplinari della banca dati ministeriale`,
    finalExam: `${DRAFT} – «La prova finale richiede 5 CFU. I corsi di prova finale sono obbligatori per tutti gli studenti»`,
  },
};

/**
 * Ambiti ministeriali per codice. Gli SSD affini (IIET elettrotecnica, IEGE economia,
 * IIND meccanica e fisica tecnica, MATH-05 analisi numerica) non compaiono nelle tabelle
 * ministeriali di base e caratterizzanti: restano fuori dal conteggio per area.
 */
const AREA_BY_CODE_2026_2027: Record<string, AreaMapping> = {
  "082740": { kind: "base", area: "math_info_stats" },
  "082747": { kind: "base", area: "math_info_stats" },
  "052425": { kind: "base", area: "math_info_stats" },
  "085903": { kind: "base", area: "math_info_stats" },
  "099319": { kind: "base", area: "math_info_stats" },
  "051124": { kind: "base", area: "physics_chemistry" },
  "085900": { kind: "base", area: "physics_chemistry" },

  "085746": { kind: "characterizing", area: "electronics" },
  "058083": { kind: "characterizing", area: "electronics" },
  "082746": { kind: "characterizing", area: "computer_engineering" },
  "085779": { kind: "characterizing", area: "computer_engineering" },
  "086067": { kind: "characterizing", area: "computer_engineering" },
  "085905": { kind: "characterizing", area: "computer_engineering" },
  "088877": { kind: "characterizing", area: "computer_engineering" },
  "085901": { kind: "characterizing", area: "computer_engineering" },
  "052511": { kind: "characterizing", area: "computer_engineering" },
  "085887": { kind: "characterizing", area: "computer_engineering" },
  "085877": { kind: "characterizing", area: "computer_engineering" },
  "052510": { kind: "characterizing", area: "computer_engineering" },
  "059429": { kind: "characterizing", area: "computer_engineering" },
  "056889": { kind: "characterizing", area: "computer_engineering" },
  "052512": { kind: "characterizing", area: "computer_engineering" },
  "089020": { kind: "characterizing", area: "computer_engineering" },
  "089013": { kind: "characterizing", area: "computer_engineering" },
  "085879": { kind: "characterizing", area: "computer_engineering" },
  "063149": { kind: "characterizing", area: "computer_engineering" },
  "063579": { kind: "characterizing", area: "computer_engineering" },
  "093283": { kind: "characterizing", area: "telecommunications" },
  "097459": { kind: "characterizing", area: "telecommunications" },
  "054303": { kind: "characterizing", area: "telecommunications" },
  "054304": { kind: "characterizing", area: "telecommunications" },
  "099322": { kind: "characterizing", area: "telecommunications" },
  "093506": { kind: "characterizing", area: "telecommunications" },
  "058084": { kind: "characterizing", area: "telecommunications" },
  "054305": { kind: "characterizing", area: "telecommunications" },
  "059430": { kind: "characterizing", area: "telecommunications" },
  "059431": { kind: "characterizing", area: "telecommunications" },
  "051231": { kind: "characterizing", area: "telecommunications" },
  "051230": { kind: "characterizing", area: "telecommunications" },
  "051234": { kind: "characterizing", area: "telecommunications" },
};

/** ING-INF/05 è insieme base e caratterizzante: nel piano contano come caratterizzanti. */
const ACTIVITY_OVERRIDES_2026_2027: Record<string, ActivityCategory> = {
  "082746": "B",
  "085779": "B",
  "086067": "B",
  "099322": "B",
  "059429": "B",
};

const DEFAULT_NEW_FREQUENCIES_2026_2027: Record<Track, Record<1 | 2 | 3, string[]>> = {
  I3I: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    // Chimica Generale non è a numero chiuso e copre l'obbligo di Fisica Tecnica in LM CSE.
    2: ["052425", "085779", "085905", "085903", "085900", "099319", "086067", "052509"],
    3: ["085746", "052511", "085887", "051289", "085877", "054441", "052510", "085923", "056889", "088804", "085901"],
  },
  I3C: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    2: ["052425", "085779", "085905", "093506", "099319", "099322", "054440"],
    3: ["085746", "093283", "097459", "097460", "051234", "054442", "051289", "054305", "059431", "085900"],
  },
};

export const CATALOG_2026_2027: Catalog = {
  academicYear: "2026/2027",
  courseCode: "531",
  dataStatus: "to_verify",
  dataStatusReason:
    `Corsi, CFU, semestri e tabelle sono trascritti dalla bozza informativa ufficiale del Regolamento didattico AA 2026/27 del corso 531, consultata il ${RETRIEVED_ON}. Il documento esiste ed è pubblicato dall'ateneo, ma può cambiare fino all'approvazione del Senato Accademico.`,
  dataNotes: [
    `Il Regolamento AA 2026/27 riporta l'avviso: «questa è una Bozza Informativa del regolamento didattico e pertanto potrebbe subire delle modifiche fino all'approvazione definitiva da parte del Senato Accademico». Prima di presentare il piano riconfronta le righe con la versione approvata.`,
    "Rispetto all'AA 2025/2026 la bozza sposta il tirocinio dentro la tabella di informatica per I3I e dentro la tabella di area generale per I3C, e allarga la tabella di area generale a Meccanica, Fisica Tecnica e Sicurezza delle Reti.",
    "La struttura dei blocchi del secondo anno (10 CFU su Logica e Algebra + tabella di area di base oppure Elettromagnetismo e Campi; 11 CFU sul blocco progettuale) è dedotta dalla colonna «CFU Gruppo» del documento HTML: il totale è attestato, la composizione delle alternative va confrontata con un export ufficiale.",
    "La disponibilità di posti dei corsi a numero chiuso (blocco in inglese del terzo anno I3I, Fisica Tecnica e Misure nella tabella di area di base) non è verificabile offline.",
    "Le tabelle del terzo anno elencano Algoritmi (10 CFU) e Segnali (10 CFU) senza i rispettivi moduli di progetto da 1 CFU: se scegli quei corsi al terzo anno, verifica sui Servizi Online se il modulo va inserito.",
    "Le finestre di presentazione e di modifica del piano, l'intervallo 30–80 CFU e il limite di 15 CFU per le scelte autonome non stanno nel Regolamento del corso: vengono dalle norme di presentazione del piano e restano da confermare sui Servizi Online.",
  ],
  sources: [
    {
      label: "Regolamento didattico del corso di studi 531, AA 2026/27 – bozza informativa",
      kind: "regolamento_draft",
      url: SOURCE_URL,
      retrievedOn: RETRIEVED_ON,
      note: "Pubblicato sui Servizi Online PoliMi con l'avviso di provvisorietà fino all'approvazione del Senato Accademico.",
    },
    {
      label: "polimi_ingegneria_informatica_piano_studi_regole.md",
      kind: "internal_extraction",
      note: "Estrazione di lavoro per le norme di presentazione del piano; i riferimenti §x.y puntano a questo documento.",
    },
  ],
  courses: COURSES_2026_2027,
  electiveGroups: ELECTIVE_GROUPS_2026_2027,
  rules: RULES_2026_2027,
  annual: ANNUAL_RULES_2026_2027,
  degree: DEGREE_RULES_2026_2027,
  defaultNewFrequencies: DEFAULT_NEW_FREQUENCIES_2026_2027,
  areaByCode: AREA_BY_CODE_2026_2027,
  activityCategoryOverrides: ACTIVITY_OVERRIDES_2026_2027,
  freeChoiceGroups: ["TABREC", "TABAUT", "TABINF", "TABING", "TABTLC", "TABCOM", "TABGEN"],
};
