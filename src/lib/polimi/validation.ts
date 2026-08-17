/**
 * Validatore del piano annuale.
 *
 * Principi:
 * - il piano è **annuale**, non la laurea intera: i vincoli di laurea (180 CFU, ambiti SSD)
 *   sono proiezioni informative, non errori bloccanti;
 * - la validazione usa sia la carriera sia il piano: ciò che è verbalizzato non viene mai richiesto;
 * - un reinserimento è obbligatorio solo se la frequenza è precedente e l'esame non è verbalizzato;
 * - le regole strutturali arrivano dalla configurazione dichiarativa del catalogo dell'anno.
 *
 * Modulo puro e testabile: nessun accesso al database, nessuna data "adesso" implicita.
 */

import {
  activityCategory,
  courseCfu,
  courseName,
  findCourse,
  findOffering,
  isFinalExamModule,
  resolveCatalog,
} from "./catalog";
import { courseGroup } from "./catalog";
import type { Catalog, CatalogDataStatus, CourseYear, RuleProvenance } from "./catalog/types";
import {
  computeAnnualTotals,
  computeRequiredReinsertions,
  type AnnualPlanTotals,
  type RequiredReinsertion,
} from "./annualPlan";
import { buildCareerView, careerRows, type CareerExamsMap, type CareerRow, type CareerView } from "./career";
import {
  CATEGORY_LABELS,
  DISCLAIMER,
  PSPA_BY_TRACK,
  type ActivityCategory,
  type ApprovalStatus,
  type Track,
} from "./constraints";
import { evaluateRules, type RuleFinding } from "./rules";
import {
  entryCfu,
  isReinsertion,
  planReferenceDate,
  type PlanEntry,
  type PlanScenario,
  type PreviousCompiledEntry,
} from "./planModel";

export type IssueSeverity = "error" | "warning" | "advice" | "info";

export type ValidationIssue = {
  id: string;
  /** `error` blocca, `warning` avvisa, `advice` consiglia, `info` spiega. */
  type: IssueSeverity;
  category: string;
  message: string;
  /** Regola o paragrafo del Manifesto applicato, mostrato all'utente. */
  source?: string;
  /** Da dove viene il vincolo: Manifesto, prassi da verificare, o ipotesi dell'utente. */
  provenance: RuleProvenance;
};

export type PlanValidationContext = {
  exams: CareerExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario?: PlanScenario | null;
  annualCfuException?: "ofa" | "graduation" | null;
  /** Data a cui valutare "già verbalizzato"; default: data di riferimento del piano. */
  asOf?: string | null;
};

export type PlanValidationSummary = AnnualPlanTotals & {
  academicYear: string;
  requestedAcademicYear: string;
  dataStatus: CatalogDataStatus;
  isFallbackCatalog: boolean;
  studentYear: CourseYear;
  track: Track;
  approvalStatus: ApprovalStatus;
  status: "valid" | "warning" | "invalid";
  contributionRule: string;
  referenceDate: string;
};

export type PlanSections = {
  /** "Da reinserire": frequenza già acquisita, esame non verbalizzato. */
  reinsertions: PlanEntry[];
  /** "Nuove frequenze": le uniche che contano per la contribuzione. */
  newFrequencies: PlanEntry[];
  supernumerary: PlanEntry[];
  /** "Esami già superati": sola lettura. */
  alreadyPassed: CareerRow[];
};

export type PlanValidationResult = {
  issues: ValidationIssue[];
  summary: PlanValidationSummary;
  sections: PlanSections;
  ruleFindings: RuleFinding[];
  requiredReinsertions: RequiredReinsertion[];
  missingReinsertions: RequiredReinsertion[];
};

function issue(
  id: string,
  type: IssueSeverity,
  category: string,
  message: string,
  source?: string,
  provenance: RuleProvenance = "manifesto"
): ValidationIssue {
  return { id, type, category, message, source, provenance };
}

/** Vincolo operativo: plausibile e utile, ma da confermare nei Servizi Online. */
function operationalIssue(id: string, type: IssueSeverity, category: string, message: string, source?: string): ValidationIssue {
  return issue(id, type, category, message, source, "operational_to_verify");
}

export function isValidReinsertionEntry(entry: PlanEntry, courseCode: string): boolean {
  return entry.courseCode === courseCode && entry.position === "effective" && isReinsertion(entry);
}

export function getApprovalStatus(entries: PlanEntry[]): ApprovalStatus {
  return entries.some((entry) => entry.position === "effective" && entry.entryKind === "external")
    ? "needs_commission_review"
    : "auto_approved_after_deadline";
}

export function validatePlanScenario(scenario: PlanScenario, context: PlanValidationContext): PlanValidationResult {
  const { catalog, requestedAcademicYear, isFallback } = resolveCatalog(scenario.cycle.academicYear);
  const track = scenario.cycle.track;
  const studentYear = scenario.cycle.studentYear;
  const referenceDate = context.asOf ?? planReferenceDate(scenario.cycle);
  const career = buildCareerView(catalog, context.exams);
  const issues: ValidationIssue[] = [];

  // --- Versione dei dati ------------------------------------------------------
  if (isFallback) {
    issues.push(operationalIssue("catalog_missing", "warning", "Dati da verificare",
      `Non esiste un catalogo per l'AA ${requestedAcademicYear}: sto usando quello ${catalog.academicYear}. Verifica ogni riga sul Manifesto ufficiale.`,
      "catalog/index.ts – resolveCatalog"));
  } else if (catalog.dataStatus === "to_verify") {
    issues.push(operationalIssue("catalog_to_verify", "warning", "Dati da verificare",
      `Il catalogo AA ${catalog.academicYear} non è confermato sul Manifesto ufficiale. ${catalog.dataNotes[0]}`,
      `catalog AA ${catalog.academicYear} – dataStatus: to_verify`));
  }

  // --- Integrità delle voci ---------------------------------------------------
  const seen = new Set<string>();
  for (const entry of scenario.entries) {
    if (seen.has(entry.courseCode)) {
      issues.push(issue(`duplicate_${entry.courseCode}`, "error", "Duplicati",
        `L'attività ${courseName(catalog, entry.courseCode)} (${entry.courseCode}) compare più di una volta nel piano.`,
        "§5 – un codice insegnamento non può contare due volte"));
    }
    seen.add(entry.courseCode);

    if (entry.entryKind === "external") continue;
    const course = findCourse(catalog, entry.courseCode);
    if (!course) {
      issues.push(issue(`unknown_${entry.courseCode}`, "error", "Catalogo",
        `Il codice ${entry.courseCode} non esiste nel catalogo AA ${catalog.academicYear}.`,
        `catalog AA ${catalog.academicYear}`));
      continue;
    }
    if (!isFinalExamModule(catalog, entry.courseCode) && !findOffering(catalog, entry.courseCode, track, entry.courseYear, entry.semester)) {
      issues.push(issue(`offering_${entry.courseCode}`, "error", "Offerta",
        `"${course.name}" non è offerto nel percorso ${track} all'anno ${entry.courseYear}, semestre ${entry.semester}.`,
        `catalog AA ${catalog.academicYear} – offerte del corso`));
    }
  }

  // --- Reinserimenti ----------------------------------------------------------
  const requiredReinsertions = computeRequiredReinsertions({
    catalog, track, studentYear,
    academicYear: scenario.cycle.academicYear,
    exams: context.exams,
    previousCompiledEntries: context.previousCompiledEntries,
    asOf: referenceDate,
  });
  const missingReinsertions = requiredReinsertions.filter(
    (required) => !scenario.entries.some((entry) => isValidReinsertionEntry(entry, required.courseCode))
  );
  for (const required of missingReinsertions) {
    const where = required.sourceAcademicYear ? `dal piano ${required.sourceAcademicYear}` : "dalla carriera";
    issues.push(issue(`reinsertion_${required.courseCode}`, "error", "Da reinserire",
      `"${required.name}" (${required.cfu} CFU) risulta già frequentato ${where} e non verbalizzato: va reinserito prima di aggiungere nuove frequenze.`,
      catalog.annual.sources.reinsertions));
  }
  for (const required of requiredReinsertions) {
    if (required.reason !== "passed_unregistered") continue;
    issues.push(issue(`unregistered_${required.courseCode}`, "warning", "Da reinserire",
      `"${required.name}" è segnato superato ma non verbalizzato: finché non risulta in carriera va trattato come non superato e reinserito.`,
      catalog.annual.sources.reinsertions));
  }
  for (const required of requiredReinsertions) {
    if (!required.registeredAfterSubmission) continue;
    issues.push(issue(`recovered_${required.courseCode}`, "info", "Da reinserire",
      `"${required.name}" è stato verbalizzato dopo la presentazione del piano: resta nel piano ma non conta più per la contribuzione.`,
      catalog.annual.sources.contribution));
  }

  // --- Regole strutturali del percorso ---------------------------------------
  const effective = scenario.entries.filter((entry) => entry.position === "effective");
  const planEffective = new Set(effective.map((entry) => entry.courseCode));
  const planAll = new Set(scenario.entries.map((entry) => entry.courseCode));
  const covered = new Set<string>([...career.registered, ...career.notRequired, ...planEffective]);
  const externalEffective = effective.filter((entry) => entry.entryKind === "external");
  const externalChoiceCfu = externalEffective.reduce((total, entry) => total + entryCfu(catalog, entry), 0);

  const groupByPlanCode = new Map<string, string | null>(
    scenario.entries.map((entry) => [
      entry.courseCode,
      entry.entryKind === "external" ? null : courseGroup(catalog, entry.courseCode, track, entry.courseYear, entry.semester),
    ])
  );

  const ruleFindings = evaluateRules({
    catalog, track, studentYear,
    validationMode: scenario.cycle.validationMode,
    covered, planEffective, planAll,
    registered: career.registered,
    externalChoiceCfu,
    groupByPlanCode,
  });

  for (const found of ruleFindings) {
    if (found.satisfied && !found.detail) continue;
    const type: IssueSeverity = found.severityHint === "blocking" ? "error" : found.severityHint === "warning" ? "warning" : "advice";
    const prefix = type === "advice" && !found.dueNow ? "Non ancora dovuto per questo anno. " : "";
    issues.push(issue(`rule_${found.ruleId}`, type, found.label, `${prefix}${found.detail}`, found.source, found.provenance));
  }

  // --- CFU annuali e contribuzione -------------------------------------------
  const totals = computeAnnualTotals(catalog, scenario, career);
  const [minCfu, maxCfu] = catalog.annual.cfuRange;
  if (!context.annualCfuException && totals.newFrequencyCfu < minCfu) {
    issues.push(issue("annual_cfu_low", "error", "CFU dell'anno",
      `Le nuove frequenze valgono ${totals.newFrequencyCfu} CFU: il minimo ordinario è ${minCfu}. Se sei in difetto di OFA o vicino alla laurea dichiara l'eccezione.`,
      catalog.annual.sources.cfuRange));
  }
  if (totals.newFrequencyCfu > maxCfu) {
    issues.push(issue("annual_cfu_high", "error", "CFU dell'anno",
      `Le nuove frequenze valgono ${totals.newFrequencyCfu} CFU: il massimo ordinario è ${maxCfu}.`,
      catalog.annual.sources.cfuRange));
  }
  if (catalog.annual.reinsertionsCountTowardRange === null && totals.reinsertedCfu > 0) {
    issues.push(operationalIssue("reinsertion_range_unknown", "warning", "Dati da verificare",
      `Il limite ${minCfu}–${maxCfu} CFU è applicato solo alle nuove frequenze (${totals.newFrequencyCfu} CFU). Non è documentato se i ${totals.reinsertedCfu} CFU reinseriti occupino lo stesso spazio: verificalo sui Servizi Online.`,
      catalog.annual.sources.cfuRange));
  }
  if (totals.supernumeraryCfu > catalog.annual.supernumeraryMaxCfu) {
    issues.push(issue("supernumerary_cfu", "error", "Soprannumero",
      `CFU in soprannumero: ${totals.supernumeraryCfu}; il massimo sull'intero corso è ${catalog.annual.supernumeraryMaxCfu}.`,
      catalog.annual.sources.supernumerary));
  }
  if (externalChoiceCfu > catalog.annual.externalFreeChoiceMaxCfu) {
    issues.push(issue("external_cfu", "error", "Scelte autonome",
      `Le attività fuori tabella valgono ${externalChoiceCfu} CFU; il massimo ammesso è ${catalog.annual.externalFreeChoiceMaxCfu}.`,
      catalog.annual.sources.externalChoices));
  }

  // --- Modifica del secondo semestre ----------------------------------------
  if (scenario.cycle.validationMode === "second_semester_revision") {
    validateSecondSemesterRevision(catalog, scenario, context, career, issues);
  }

  // --- Proiezione verso la laurea (consigli, non errori) --------------------
  issues.push(...projectDegreeAdvice(catalog, scenario, career, track));

  // --- Contesto -------------------------------------------------------------
  const pspa = PSPA_BY_TRACK[track];
  issues.push(issue("pspa_structure", "info", "Percorso",
    `Milano Leonardo in presenza: anno 1 ${pspa.year1}, anno 2 ${pspa.year2}, anno 3 ${pspa.year3}.`,
    "§1 – regola strutturale campus/PSPA"));
  const approvalStatus = getApprovalStatus(scenario.entries);
  issues.push(issue("approval", approvalStatus === "needs_commission_review" ? "warning" : "info", "Approvazione",
    approvalStatus === "needs_commission_review"
      ? "Il piano contiene attività fuori dalle tabelle preapprovate: serve la valutazione della commissione."
      : "Tutte le scelte appartengono alle tabelle ufficiali: approvazione automatica alla scadenza.",
    "§2.3 – piano consigliato vs autonomo"));
  issues.push(issue("disclaimer", "info", "Avvertenza", DISCLAIMER));

  const hasError = issues.some((item) => item.type === "error");
  const hasWarning = issues.some((item) => item.type === "warning");

  return {
    issues,
    summary: {
      ...totals,
      academicYear: catalog.academicYear,
      requestedAcademicYear,
      dataStatus: catalog.dataStatus,
      isFallbackCatalog: isFallback,
      studentYear,
      track,
      approvalStatus,
      status: hasError ? "invalid" : hasWarning ? "warning" : "valid",
      contributionRule: catalog.annual.sources.contribution,
      referenceDate,
    },
    sections: buildPlanSections(catalog, scenario, context.exams, track),
    ruleFindings,
    requiredReinsertions,
    missingReinsertions,
  };
}

export function buildPlanSections(
  catalog: Catalog,
  scenario: PlanScenario,
  exams: CareerExamsMap,
  track: Track
): PlanSections {
  const effective = scenario.entries.filter((entry) => entry.position === "effective");
  return {
    reinsertions: effective.filter(isReinsertion),
    newFrequencies: effective.filter((entry) => !isReinsertion(entry)),
    supernumerary: scenario.entries.filter((entry) => entry.position === "supernumerary"),
    alreadyPassed: careerRows(catalog, exams, track).filter((row) => row.status === "passed_registered"),
  };
}

function validateSecondSemesterRevision(
  catalog: Catalog,
  scenario: PlanScenario,
  context: PlanValidationContext,
  career: CareerView,
  issues: ValidationIssue[]
): void {
  const revision = catalog.annual.secondSemesterRevision;
  const source = catalog.annual.sources.revision;
  const base = context.baseRevisionScenario;

  if (!base || base.cycle.status !== "polimi_compiled" || scenario.cycle.revisionOfCycleId !== base.cycle.id) {
    issues.push(issue("revision_no_base", "error", "Modifica 2° semestre",
      "La modifica semestrale deve partire da un piano realmente compilato su PoliMi.", source));
    return;
  }
  if (!revision.allowTrackChange && scenario.cycle.track !== base.cycle.track) {
    issues.push(issue("revision_track", "error", "Modifica 2° semestre",
      "Nella modifica semestrale non puoi cambiare percorso/PSPA: quella scelta è fissata dalla presentazione annuale.", source));
  }
  if (scenario.cycle.studentYear !== base.cycle.studentYear || scenario.cycle.academicYear !== base.cycle.academicYear) {
    issues.push(issue("revision_scope", "error", "Modifica 2° semestre",
      "La modifica semestrale riguarda lo stesso anno accademico e lo stesso anno di corso del piano presentato.", source));
  }

  const baseByCode = new Map(base.entries.map((entry) => [entry.courseCode, entry]));
  const currentByCode = new Map(scenario.entries.map((entry) => [entry.courseCode, entry]));

  for (const entry of scenario.entries) {
    if (baseByCode.has(entry.courseCode)) continue;
    if (entry.semester !== revision.editableSemester) {
      issues.push(issue(`revision_add_${entry.courseCode}`, "error", "Modifica 2° semestre",
        `Puoi aggiungere solo insegnamenti del ${revision.editableSemester}° semestre: "${courseName(catalog, entry.courseCode)}" è del ${entry.semester}° semestre.`, source));
    }
  }
  for (const entry of base.entries) {
    if (currentByCode.has(entry.courseCode)) continue;
    if (entry.semester !== revision.editableSemester) {
      issues.push(issue(`revision_remove_${entry.courseCode}`, "error", "Modifica 2° semestre",
        `Puoi rimuovere solo insegnamenti del ${revision.editableSemester}° semestre: "${courseName(catalog, entry.courseCode)}" è del ${entry.semester}° semestre e resta nel piano anche se lo hai superato.`, source));
    }
  }

  if (!revision.allowSelfCertification) {
    const unregistered = scenario.entries.filter((entry) => career.passedUnregistered.has(entry.courseCode));
    for (const entry of unregistered) {
      issues.push(issue(`revision_selfcert_${entry.courseCode}`, "warning", "Modifica 2° semestre",
        `"${courseName(catalog, entry.courseCode)}" è superato ma non ancora verbalizzato: nella modifica semestrale non puoi autocertificarlo, resta nel piano finché non compare in carriera.`, source));
    }
  }
}

/**
 * Vincoli di laurea come proiezione informativa: carriera verbalizzata più attività del piano.
 * Non bloccano il piano annuale, che per definizione copre un anno solo.
 */
function projectDegreeAdvice(
  catalog: Catalog,
  scenario: PlanScenario,
  career: CareerView,
  track: Track
): ValidationIssue[] {
  const advice: ValidationIssue[] = [];
  const degree = catalog.degree;

  const byCategory: Record<ActivityCategory, number> = { A: 0, B: 0, C: 0, D: 0, V: 0, T: 0 };
  const areaTotals = {
    base: { math_info_stats: 0, physics_chemistry: 0 },
    characterizing: { electronics: 0, computer_engineering: 0, telecommunications: 0 },
  };
  let projectedCfu = 0;

  const contributing = new Map<string, { cfu: number; category: ActivityCategory }>();
  for (const code of career.registered) {
    contributing.set(code, { cfu: courseCfu(catalog, code), category: activityCategory(catalog, code, track) });
  }
  for (const entry of scenario.entries) {
    if (entry.position !== "effective" || contributing.has(entry.courseCode)) continue;
    contributing.set(entry.courseCode, {
      cfu: entryCfu(catalog, entry),
      category: entry.entryKind === "external" ? "D" : activityCategory(catalog, entry.courseCode, track, entry.courseYear, entry.semester),
    });
  }

  for (const [code, { cfu, category }] of contributing) {
    projectedCfu += cfu;
    byCategory[category] += cfu;
    const area = catalog.areaByCode[code];
    if (!area || category === "D") continue;
    if (area.kind === "base") areaTotals.base[area.area] += cfu;
    else areaTotals.characterizing[area.area] += cfu;
  }

  advice.push(issue("projection_total", "info", "Proiezione laurea",
    `Carriera verbalizzata più piano corrente: ${projectedCfu} / ${degree.totalCfu} CFU effettivi.`,
    degree.sources.totalCfu));

  for (const [category, minimum] of Object.entries(degree.categoryMinimums)) {
    const typed = category as ActivityCategory;
    if (byCategory[typed] < (minimum ?? 0)) {
      advice.push(issue(`projection_category_${category}`, "advice", "Proiezione laurea",
        `${CATEGORY_LABELS[category]} (${category}): ${byCategory[typed]} CFU sui ${minimum} minimi per laurearti. Recupererai il resto negli anni successivi.`,
        degree.sources.totalCfu));
    }
  }
  if (byCategory.V !== degree.finalExamCfu) {
    advice.push(issue("projection_final_exam", "advice", "Proiezione laurea",
      `I moduli di prova finale proiettati valgono ${byCategory.V} CFU sui ${degree.finalExamCfu} richiesti.`,
      degree.sources.finalExam));
  }
  const [minFree, maxFree] = degree.freeChoiceCfuRange;
  if (byCategory.D > maxFree) {
    advice.push(issue("projection_free_choice", "advice", "Proiezione laurea",
      `Le attività a scelta proiettate valgono ${byCategory.D} CFU: l'intervallo per la laurea è ${minFree}–${maxFree}.`,
      degree.sources.totalCfu));
  }

  for (const [area, rule] of Object.entries(degree.baseAreaRules)) {
    const cfu = areaTotals.base[area as keyof typeof areaTotals.base];
    if (cfu > rule.max) {
      advice.push(issue(`projection_base_${area}`, "advice", "Proiezione laurea",
        `${rule.label}: ${cfu} CFU, oltre il massimo ministeriale di ${rule.max}.`, degree.sources.areas));
    }
  }
  for (const [area, rule] of Object.entries(degree.characterizingAreaRules)) {
    const cfu = areaTotals.characterizing[area as keyof typeof areaTotals.characterizing];
    if (cfu > rule.max) {
      advice.push(issue(`projection_char_${area}`, "advice", "Proiezione laurea",
        `${rule.label}: ${cfu} CFU, oltre il massimo ministeriale di ${rule.max}.`, degree.sources.areas));
    }
  }

  return advice;
}
