import { getCourse, getCourseOffering } from "./courses";
import { activityCategoryForCourse } from "./cfuCalc";
import {
  BASE_AREA_RULES,
  BASE_TOTAL_CFU_RANGE,
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  CHARACTERIZING_AREA_RULES,
  CHARACTERIZING_TOTAL_CFU_RANGE,
  COURSE_AREA_BY_CODE,
  EXTERNAL_FREE_CHOICE_CFU_MAX,
  FINAL_EXAM_CFU,
  FREE_CHOICE_CFU_RANGE,
  INTERNSHIP_COURSE_CODES,
  NOTA_MAGISTRALE,
  PSPA_BY_TRACK,
  SUPERNUMERARY_CFU_MAX,
  TOTAL_CFU_REQUIRED,
  YEAR_CFU_RANGE,
  type ActivityCategory,
  type ApprovalStatus,
  type Track,
} from "./constraints";
import type { ExamsMap } from "@/lib/esami";
import type { PlanEntry, PlanScenario } from "@/lib/piano";

export type ValidationIssue = {
  id: string;
  type: "error" | "warning" | "info";
  category: string;
  message: string;
};

export type PreviousCompiledEntry = {
  cycle: { id: number | null; academicYear: string; studentYear?: 1 | 2 | 3 };
  entry: PlanEntry;
};

export type PlanValidationContext = {
  exams: ExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario?: PlanScenario | null;
  annualCfuException?: "ofa" | "graduation" | null;
};

export type PlanValidationSummary = {
  totalEffectiveCfu: number;
  annualFeeCfu: number;
  recoveredCfu: number;
  supernumeraryCfu: number;
  approvalStatus: ApprovalStatus;
};

const YEAR_ONE_REQUIRED = ["082740", "082746", "082747", "051124", "082748", "054303"];
const YEAR_TWO_COMMON = ["052425", "085779", "085905"];
const TABA_CODES = ["085900", "058081", "058083", "058084"];
const PROBABILITY_BLOCK = ["099319", "054304"];
const I3I_FIXED = ["085746", "085877", "054441", "052510", "085923"];
const I3C_FIXED = ["085746", "093283", "097459", "097460", "051234", "054442", "051289"];
const I3I_CHOICE_GROUPS = new Set(["TABREC", "TABAUT", "TABINF", "TABING", "TABTLC"]);
const I3C_CHOICE_GROUPS = new Set(["TABCOM", "TABGEN"]);

function issue(id: string, type: ValidationIssue["type"], category: string, message: string): ValidationIssue {
  return { id, type, category, message };
}

function entryCfu(entry: PlanEntry): number {
  return entry.entryKind === "external" ? entry.externalCfu ?? 0 : getCourse(entry.courseCode)?.cfu ?? 0;
}

function entryCategory(entry: PlanEntry, track: Track): ActivityCategory {
  if (entry.entryKind === "external") return "D";
  const course = getCourse(entry.courseCode);
  if (!course) return "C";
  if (course.offerings) {
    return getCourseOffering(entry.courseCode, track, entry.courseYear, entry.semester)?.category ?? course.type[0] ?? "C";
  }
  return activityCategoryForCourse(course);
}

function entryGroup(entry: PlanEntry, track: Track): string | null {
  if (entry.entryKind === "external") return null;
  const course = getCourse(entry.courseCode);
  if (!course) return null;
  return getCourseOffering(entry.courseCode, track, entry.courseYear, entry.semester)?.group ?? course.electiveGroup;
}

function isLinkedModule(entry: PlanEntry): boolean {
  return entry.entryKind === "catalog" && Boolean(getCourse(entry.courseCode)?.isLinkedExam);
}

function addMissingCodes(issues: ValidationIssue[], codes: string[], selected: Set<string>, category: string): void {
  for (const code of codes) {
    if (!selected.has(code)) issues.push(issue(`missing_${code}`, "error", category, `Manca l'attività obbligatoria "${getCourse(code)?.name ?? code}" (${code}).`));
  }
}

export function validatePlanScenario(scenario: PlanScenario, context: PlanValidationContext): { issues: ValidationIssue[]; summary: PlanValidationSummary } {
  const issues: ValidationIssue[] = [];
  const effective = scenario.entries.filter((entry) => entry.position === "effective");
  const supernumerary = scenario.entries.filter((entry) => entry.position === "supernumerary");
  const selected = new Set(effective.map((entry) => entry.courseCode));
  const duplicateCodes = scenario.entries.filter((entry, index, all) => all.findIndex((other) => other.courseCode === entry.courseCode) !== index);
  for (const duplicate of duplicateCodes) issues.push(issue(`duplicate_${duplicate.courseCode}`, "error", "Duplicati", `L'attività ${duplicate.courseCode} compare più di una volta.`));

  for (const entry of scenario.entries) {
    if (entry.entryKind === "external") continue;
    const course = getCourse(entry.courseCode);
    if (!course) {
      issues.push(issue(`unknown_${entry.courseCode}`, "error", "Catalogo", `Codice corso sconosciuto: ${entry.courseCode}.`));
      continue;
    }
    if (!course.isLinkedExam && !getCourseOffering(entry.courseCode, scenario.cycle.track, entry.courseYear, entry.semester)) {
      issues.push(issue(`offering_${entry.courseCode}`, "error", "Offerta", `L'offerta di "${course.name}" non è compatibile con percorso, anno e semestre scelti.`));
    }
  }

  const pspa = PSPA_BY_TRACK[scenario.cycle.track];
  issues.push(issue("pspa_structure", "info", "PSPA", `Milano Leonardo in presenza: anno 1 ${pspa.year1}, anno 2 ${pspa.year2}, anno 3 ${pspa.year3}.`));

  addMissingCodes(issues, YEAR_ONE_REQUIRED, selected, "Anno 1 – IT1");
  addMissingCodes(issues, YEAR_TWO_COMMON, selected, "Anno 2 – IT1");

  const yearTwo = effective.filter((entry) => entry.courseYear === 2);
  const yearTwoCodes = new Set(yearTwo.map((entry) => entry.courseCode));
  const tabaCount = TABA_CODES.filter((code) => yearTwoCodes.has(code)).length;
  const b1Logica = yearTwoCodes.has("085903") && tabaCount === 1 && !yearTwoCodes.has("093506");
  const b1Campi = yearTwoCodes.has("093506") && !yearTwoCodes.has("085903") && tabaCount === 0;
  if (!b1Logica && !b1Campi) {
    issues.push(issue("year2_b1", "error", "Anno 2 – blocco B1", "Scegli un blocco completo: Logica e Algebra + un corso TABA, oppure Elettromagnetismo e Campi."));
  }
  if (scenario.cycle.track === "I3I" && !b1Logica) {
    issues.push(issue("i3i_logica", "error", "I3I", "Il percorso I3I richiede Logica e Algebra e una scelta TABA."));
  }

  const probabilityCount = PROBABILITY_BLOCK.filter((code) => yearTwoCodes.has(code)).length;
  if (probabilityCount !== 1) issues.push(issue("year2_b2", "error", "Anno 2 – blocco B2", "Scegli esattamente uno tra Probabilità e Statistica e Informazione e Stima."));

  const requiredB3 = scenario.cycle.track === "I3I" ? ["086067", "052509"] : ["099322", "054440"];
  addMissingCodes(issues, requiredB3, selected, "Anno 2 – blocco B3");

  if (scenario.cycle.track === "I3I") {
    addMissingCodes(issues, I3I_FIXED, selected, "Anno 3 – I3I");
    const italian = ["052511", "085887", "051289"].filter((code) => selected.has(code));
    const english = ["063149", "063579", "063150"].filter((code) => selected.has(code));
    if (!((italian.length === 3 && english.length === 0) || (english.length === 3 && italian.length === 0))) {
      issues.push(issue("i3i_language_bundle", "error", "Anno 3 – bundle lingua", "Seleziona il bundle italiano completo oppure quello inglese completo, senza combinazioni miste."));
    }
  } else {
    addMissingCodes(issues, I3C_FIXED, selected, "Anno 3 – I3C");
  }

  const externalEffective = effective.filter((entry) => entry.entryKind === "external");
  const externalCfu = externalEffective.reduce((sum, entry) => sum + entryCfu(entry), 0);
  if (externalCfu > EXTERNAL_FREE_CHOICE_CFU_MAX) {
    issues.push(issue("external_cfu", "error", "Scelte autonome", `Le attività esterne valgono ${externalCfu} CFU; il massimo ammesso è ${EXTERNAL_FREE_CHOICE_CFU_MAX}.`));
  }

  const allowedChoiceGroups = scenario.cycle.track === "I3I" ? I3I_CHOICE_GROUPS : I3C_CHOICE_GROUPS;
  const officialChoiceEntries = effective.filter((entry) =>
    entry.courseYear === 3 && !isLinkedModule(entry) && allowedChoiceGroups.has(entryGroup(entry, scenario.cycle.track) ?? "")
  );
  const choiceCfu = officialChoiceEntries.reduce((sum, entry) => sum + entryCfu(entry), 0) + externalCfu;
  if (choiceCfu !== 15) {
    issues.push(issue("track_choices_15", "error", `Scelte ${scenario.cycle.track}`, `Le tabelle ammesse e le eventuali attività esterne devono totalizzare esattamente 15 CFU; attualmente ${choiceCfu}.`));
  }

  const totalEffectiveCfu = effective.reduce((sum, entry) => sum + entryCfu(entry), 0);
  if (totalEffectiveCfu !== TOTAL_CFU_REQUIRED) {
    issues.push(issue("total_cfu", "error", "CFU Totali", `CFU effettivi: ${totalEffectiveCfu} / ${TOTAL_CFU_REQUIRED}. Il totale deve essere esattamente ${TOTAL_CFU_REQUIRED}.`));
  }
  const supernumeraryCfu = supernumerary.reduce((sum, entry) => sum + entryCfu(entry), 0);
  if (supernumeraryCfu > SUPERNUMERARY_CFU_MAX) issues.push(issue("supernumerary_cfu", "error", "Soprannumero", `CFU soprannumerari: ${supernumeraryCfu} / ${SUPERNUMERARY_CFU_MAX}.`));

  const byCategory: Record<ActivityCategory, number> = { A: 0, B: 0, C: 0, D: 0, V: 0, T: 0 };
  for (const entry of effective) byCategory[entryCategory(entry, scenario.cycle.track)] += entryCfu(entry);
  for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
    const typed = category as ActivityCategory;
    if (byCategory[typed] < minimum) issues.push(issue(`category_${category}`, "error", "CFU per Categoria", `${CATEGORY_LABELS[category]} (${category}): ${byCategory[typed]} / ${minimum} CFU minimi.`));
  }
  if (byCategory.V !== FINAL_EXAM_CFU) issues.push(issue("final_exam_cfu", "error", "Prova Finale", `I moduli ufficiali di prova finale devono valere ${FINAL_EXAM_CFU} CFU; attualmente ${byCategory.V}.`));
  if (byCategory.D < FREE_CHOICE_CFU_RANGE[0] || byCategory.D > FREE_CHOICE_CFU_RANGE[1]) {
    issues.push(issue("free_choice_range", "error", "Attività a scelta", `Attività di categoria D: ${byCategory.D} CFU; intervallo richiesto ${FREE_CHOICE_CFU_RANGE[0]}–${FREE_CHOICE_CFU_RANGE[1]}.`));
  }

  const areaTotals = {
    base: { math_info_stats: 0, physics_chemistry: 0 },
    characterizing: { electronics: 0, computer_engineering: 0, telecommunications: 0 },
  };
  for (const entry of effective) {
    if (entry.entryKind === "external" || entryCategory(entry, scenario.cycle.track) === "D") continue;
    const mapping = COURSE_AREA_BY_CODE[entry.courseCode];
    if (!mapping) continue;
    if (mapping.kind === "base") areaTotals.base[mapping.area] += entryCfu(entry);
    else areaTotals.characterizing[mapping.area] += entryCfu(entry);
  }
  const baseTotal = Object.values(areaTotals.base).reduce((a, b) => a + b, 0);
  for (const [area, rule] of Object.entries(BASE_AREA_RULES)) {
    const cfu = areaTotals.base[area as keyof typeof areaTotals.base];
    if (cfu < rule.min || cfu > rule.max) issues.push(issue(`base_area_${area}`, "error", "Aree di base", `${rule.label}: ${cfu} CFU, intervallo ${rule.min}–${rule.max}.`));
  }
  if (baseTotal < BASE_TOTAL_CFU_RANGE[0] || baseTotal > BASE_TOTAL_CFU_RANGE[1]) issues.push(issue("base_total", "error", "Aree di base", `Totale aree di base: ${baseTotal} CFU, intervallo ${BASE_TOTAL_CFU_RANGE[0]}–${BASE_TOTAL_CFU_RANGE[1]}.`));
  const characterizingTotal = Object.values(areaTotals.characterizing).reduce((a, b) => a + b, 0);
  for (const [area, rule] of Object.entries(CHARACTERIZING_AREA_RULES)) {
    const cfu = areaTotals.characterizing[area as keyof typeof areaTotals.characterizing];
    if (cfu < rule.min || cfu > rule.max) issues.push(issue(`characterizing_area_${area}`, "error", "Aree caratterizzanti", `${rule.label}: ${cfu} CFU, intervallo ${rule.min}–${rule.max}.`));
  }
  if (characterizingTotal < CHARACTERIZING_TOTAL_CFU_RANGE[0] || characterizingTotal > CHARACTERIZING_TOTAL_CFU_RANGE[1]) issues.push(issue("characterizing_total", "error", "Aree caratterizzanti", `Totale aree caratterizzanti: ${characterizingTotal} CFU, intervallo ${CHARACTERIZING_TOTAL_CFU_RANGE[0]}–${CHARACTERIZING_TOTAL_CFU_RANGE[1]}.`));

  const annualFeeCfu = scenario.entries.filter((entry) => entry.feeCounted).reduce((sum, entry) => sum + entryCfu(entry), 0);
  if (!context.annualCfuException && annualFeeCfu < YEAR_CFU_RANGE[0]) issues.push(issue("annual_cfu_low", "error", "CFU Anno", `CFU di nuova frequenza: ${annualFeeCfu}; minimo ${YEAR_CFU_RANGE[0]}. Indica esplicitamente un'eccezione OFA/prossimità alla laurea se applicabile.`));
  if (annualFeeCfu > YEAR_CFU_RANGE[1]) issues.push(issue("annual_cfu_high", "error", "CFU Anno", `CFU di nuova frequenza: ${annualFeeCfu}; massimo ${YEAR_CFU_RANGE[1]}.`));
  const recoveredCfu = scenario.entries.filter((entry) => !entry.feeCounted && ["carried_over", "recovery_reinserted"].includes(entry.origin)).reduce((sum, entry) => sum + entryCfu(entry), 0);

  const requiredReinsertions = getRequiredReinsertions(context.previousCompiledEntries, context.exams);
  for (const required of requiredReinsertions) {
    if (!scenario.entries.some((entry) => isValidReinsertionEntry(entry, required.courseCode))) {
      issues.push(issue(`reinsertion_${required.courseCode}`, "error", "Reinserimenti", `"${getCourse(required.courseCode)?.name ?? required.courseCode}" va reinserito dal piano ${required.sourceAcademicYear}.`));
    }
  }

  if (scenario.cycle.validationMode === "second_semester_revision") validateSecondSemesterRevision(scenario, context.baseRevisionScenario, issues);

  const internships = effective.filter((entry) => INTERNSHIP_COURSE_CODES.includes(entry.courseCode));
  if (internships.length > 1) issues.push(issue("internship_duplicate", "error", "Tirocinio", "Seleziona una sola variante di tirocinio."));
  if (internships.some((entry) => entryCfu(entry) === 10)) issues.push(issue("internship_lm", "warning", "Tirocinio", "Il tirocinio da 10 CFU può comportare obblighi aggiuntivi per l'accesso alla Laurea Magistrale."));
  if (!selected.has(NOTA_MAGISTRALE.MUST_HAVE[0])) issues.push(issue("nota_meccanica", "warning", "Nota Magistrale", "Meccanica non è nel piano e può diventare un debito formativo alla LM-32."));

  const approvalStatus = getApprovalStatus(scenario.entries);
  issues.push(issue("approval", approvalStatus === "needs_commission_review" ? "warning" : "info", "Approvazione", approvalStatus === "needs_commission_review"
    ? "Il piano contiene attività esterne: è prevista la valutazione della commissione."
    : "Le scelte appartengono alle tabelle ufficiali preapprovate."));
  issues.push(issue("annual_fee_info", "info", "CFU Tassa", `CFU di nuova frequenza stimati: ${annualFeeCfu}.`));

  return { issues, summary: { totalEffectiveCfu, annualFeeCfu, recoveredCfu, supernumeraryCfu, approvalStatus } };
}

export function getRequiredReinsertions(previous: PreviousCompiledEntry[], exams: ExamsMap) {
  const required = new Map<string, { courseCode: string; sourceCycleId: number; sourceAcademicYear: string }>();
  for (const { cycle, entry } of previous) {
    if (required.has(entry.courseCode) || !cycle.id || entry.position !== "effective" || entry.entryKind !== "catalog") continue;
    const course = getCourse(entry.courseCode);
    if (!course || course.isLinkedExam) continue;
    const wasDueOrAttended = entry.courseYear <= (cycle.studentYear ?? 3) || ["carried_over", "recovery_reinserted"].includes(entry.origin);
    if (!wasDueOrAttended) continue;
    const status = exams[entry.courseCode]?.status;
    if (status === "passed_registered" || status === "not_required") continue;
    required.set(entry.courseCode, { courseCode: entry.courseCode, sourceCycleId: cycle.id, sourceAcademicYear: cycle.academicYear });
  }
  return [...required.values()];
}

export function isValidReinsertionEntry(entry: PlanEntry, courseCode: string): boolean {
  return entry.courseCode === courseCode && entry.position === "effective"
    && ["carried_over", "recovery_reinserted"].includes(entry.origin);
}

export function getApprovalStatus(entries: PlanEntry[]): ApprovalStatus {
  return entries.some((entry) => entry.position === "effective" && entry.entryKind === "external")
    ? "needs_commission_review"
    : "auto_approved_after_deadline";
}

function validateSecondSemesterRevision(scenario: PlanScenario, base: PlanScenario | null | undefined, issues: ValidationIssue[]): void {
  if (!base || base.cycle.status !== "polimi_compiled" || scenario.cycle.revisionOfCycleId !== base.cycle.id) {
    issues.push(issue("revision_no_base", "error", "Revisione", "La revisione deve essere collegata a uno scenario base realmente compilato su PoliMi."));
    return;
  }
  if (scenario.cycle.track !== base.cycle.track) issues.push(issue("revision_track", "error", "Revisione", "In revisione non è possibile cambiare percorso."));
  const baseByCode = new Map(base.entries.map((entry) => [entry.courseCode, entry]));
  const currentByCode = new Map(scenario.entries.map((entry) => [entry.courseCode, entry]));
  for (const entry of scenario.entries) {
    if (!baseByCode.has(entry.courseCode) && entry.semester !== 2) issues.push(issue(`revision_add_${entry.courseCode}`, "error", "Revisione", `Puoi aggiungere solo attività del secondo semestre: ${entry.courseCode}.`));
  }
  for (const entry of base.entries) {
    if (!currentByCode.has(entry.courseCode) && entry.semester !== 2) issues.push(issue(`revision_remove_${entry.courseCode}`, "error", "Revisione", `Puoi rimuovere solo attività del secondo semestre: ${entry.courseCode}.`));
  }
}
