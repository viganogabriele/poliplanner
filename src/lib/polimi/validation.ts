import { getCourse } from "./courses";
import {
  TOTAL_CFU_REQUIRED, CATEGORY_MINIMUMS, CATEGORY_LABELS, FREE_CHOICE_CFU_RANGE,
  YEAR_CFU_RANGE, SUPERNUMERARY_CFU_MAX, TABA_PICK_COUNT, APPROVED_FREE_CHOICE_GROUPS,
  TABREC_COURSE_CODES, PROBSTAT_COURSE_CODES, I3C_REQUIRED_COURSE_CODES,
  INTERNSHIP_COURSE_CODES, NOTA_MAGISTRALE, PSPA_BY_TRACK,
  FINAL_EXAM_CFU, BASE_AREA_RULES, BASE_TOTAL_CFU_RANGE,
  CHARACTERIZING_AREA_RULES, CHARACTERIZING_TOTAL_CFU_RANGE,
} from "./constraints";
import {
  activityCategoryForCourse,
  sumCFUByCategory,
  sumCFUByMinisterialArea,
  cfuPerYearIncludingSoprannumero,
  allPlanoCodes,
  sumCFU,
  totalSoprannumeroCFU,
} from "./cfuCalc";
import type { ActivityCategory, Track } from "./constraints";
import type { ApprovalStatus } from "./constraints";
import type { ExamsMap } from "@/lib/esami";
import type { Piano, PlanEntry, PlanScenario } from "@/lib/piano";

export type ValidationIssue = {
  id: string;
  type: "error" | "warning" | "info";
  category: string;
  message: string;
};

export type PreviousCompiledEntry = {
  cycle: {
    id: number | null;
    academicYear: string;
  };
  entry: PlanEntry;
};

export type PlanValidationContext = {
  exams: ExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario?: PlanScenario | null;
};

export type PlanValidationSummary = {
  totalEffectiveCfu: number;
  annualFeeCfu: number;
  recoveredCfu: number;
  supernumeraryCfu: number;
  approvalStatus: ApprovalStatus;
};

export function validatePlan(piano: Piano, track: Track): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allCodes = allPlanoCodes(piano);
  const allCourses = allCodes.map(getCourse).filter((c): c is NonNullable<typeof c> => !!c && !c.isLinkedExam);
  const effectiveCodes = new Set(allCodes);
  const effectiveCourses = allCourses.filter((course) => effectiveCodes.has(course.code));
  const pspa = PSPA_BY_TRACK[track];

  issues.push({
    id: "pspa_structure",
    type: "info",
    category: "PSPA",
    message: `Struttura ${pspa.campus} ${pspa.mode}: anno 1 ${pspa.year1}, anno 2 ${pspa.year2}, anno 3 ${pspa.year3}.`,
  });

  // 1. Total CFU
  const total = sumCFU(effectiveCourses);
  if (total < TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_low", type: "error", category: "CFU Totali", message: `CFU totali: ${total} / ${TOTAL_CFU_REQUIRED}. Mancano ${TOTAL_CFU_REQUIRED - total} CFU.` });
  } else if (total > TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_high", type: "warning", category: "CFU Totali", message: `CFU totali: ${total} (supera i ${TOTAL_CFU_REQUIRED} richiesti di ${total - TOTAL_CFU_REQUIRED} CFU).` });
  }

  // 2. Per-category minimums
  const byCategory = sumCFUByCategory(effectiveCourses);
  Object.entries(CATEGORY_MINIMUMS).forEach(([cat, min]) => {
    const category = cat as ActivityCategory;
    if ((byCategory[category] ?? 0) < min) {
      issues.push({ id: `category_${cat}_low`, type: "error", category: "CFU per Categoria", message: `${CATEGORY_LABELS[cat]} (${cat}): ${byCategory[category] ?? 0} / ${min} CFU minimi richiesti.` });
    }
  });

  // 3. Final exam
  if (!allCodes.includes("FINALE")) {
    issues.push({ id: "no_final_exam", type: "error", category: "Prova Finale", message: "La Prova Finale (5 CFU) è obbligatoria e non è nel piano." });
  } else if ((byCategory.V ?? 0) !== FINAL_EXAM_CFU) {
    issues.push({ id: "final_exam_cfu", type: "error", category: "Prova Finale", message: `La Prova Finale deve valere ${FINAL_EXAM_CFU} CFU effettivi. Attualmente: ${byCategory.V ?? 0} CFU.` });
  }

  // 4. Per-year CFU range and supernumerary limit
  const yearCFU = cfuPerYearIncludingSoprannumero(piano);
  ([1, 2, 3] as const).forEach((y) => {
    const cfu = yearCFU[y] ?? 0;
    if (piano[y].courses.length === 0 && piano[y].soprannumero.length === 0) return;
    if (cfu < YEAR_CFU_RANGE[0]) {
      issues.push({ id: `year_${y}_cfu_low`, type: "warning", category: `Anno ${y}`, message: `Anno ${y}: ${cfu} CFU (minimo ${YEAR_CFU_RANGE[0]} CFU per anno).` });
    }
    if (cfu > YEAR_CFU_RANGE[1]) {
      issues.push({ id: `year_${y}_cfu_high`, type: "error", category: `Anno ${y}`, message: `Anno ${y}: ${cfu} CFU supera il limite di ${YEAR_CFU_RANGE[1]} CFU.` });
    }
  });
  const supernumeraryCFU = totalSoprannumeroCFU(piano);
  if (supernumeraryCFU > SUPERNUMERARY_CFU_MAX) {
    issues.push({ id: "soprannumero_high", type: "error", category: "Soprannumero", message: `CFU soprannumerari: ${supernumeraryCFU} / ${SUPERNUMERARY_CFU_MAX}.` });
  }

  // 5. TABA rule
  const tabaCourses = effectiveCourses.filter((c) => c.electiveGroup === "TABA");
  if (tabaCourses.length < TABA_PICK_COUNT) {
    issues.push({ id: "taba_missing", type: "error", category: "Gruppo TABA", message: `Scegli esattamente ${TABA_PICK_COUNT} corso dal gruppo TABA. Attualmente: ${tabaCourses.length}.` });
  } else if (tabaCourses.length > TABA_PICK_COUNT) {
    issues.push({ id: "taba_excess", type: "error", category: "Gruppo TABA", message: `Hai selezionato ${tabaCourses.length} corsi dal gruppo TABA, consentito solo ${TABA_PICK_COUNT}.` });
  }

  // 6. Probabilità/Statistica
  const probStatSelected = allCodes.filter((c) => PROBSTAT_COURSE_CODES.includes(c));
  if (probStatSelected.length === 0) {
    issues.push({ id: "probstat_missing", type: "error", category: "Anno 2", message: 'Scegli uno tra "Probabilità e Statistica" e "Informazione e Stima".' });
  } else if (probStatSelected.length > 1) {
    issues.push({ id: "probstat_both", type: "error", category: "Anno 2", message: 'Hai selezionato sia "Probabilità e Statistica" sia "Informazione e Stima" come effettivi.' });
  }

  // 7. TABREC (I3I)
  if (track === "I3I") {
    TABREC_COURSE_CODES.forEach((code) => {
      if (!allCodes.includes(code)) {
        const c = getCourse(code);
        issues.push({ id: `tabrec_missing_${code}`, type: "error", category: "TABREC", message: `"${c?.name}" è obbligatorio per I3I (TABREC) e non è nel piano.` });
      }
    });
  }
  if (track === "I3C") {
    I3C_REQUIRED_COURSE_CODES.forEach((code) => {
      if (!allCodes.includes(code)) {
        const c = getCourse(code);
        issues.push({ id: `i3c_required_missing_${code}`, type: "error", category: "I3C", message: `"${c?.name}" è obbligatorio per I3C e non è nel piano.` });
      }
    });
  }

  // 8. Track mixing
  effectiveCourses.forEach((c) => {
    if (!c.track || c.track === "both" || c.track === null) return;
    if (c.track !== track) {
      issues.push({ id: `track_mismatch_${c.code}`, type: "warning", category: "Percorso", message: `"${c.name}" appartiene al percorso ${c.track}, ma stai pianificando ${track}.` });
    }
  });

  // 9. Free-choice CFU
  const freeChoiceCourses = effectiveCourses.filter((c) => activityCategoryForCourse(c) === "D");
  const freeChoiceCFU = sumCFU(freeChoiceCourses);
  if (freeChoiceCFU < FREE_CHOICE_CFU_RANGE[0]) {
    issues.push({ id: "free_choice_low", type: "error", category: "Corsi a Scelta", message: `CFU a scelta: ${freeChoiceCFU}. Minimo: ${FREE_CHOICE_CFU_RANGE[0]} CFU.` });
  }
  if (freeChoiceCFU > FREE_CHOICE_CFU_RANGE[1]) {
    issues.push({ id: "free_choice_high", type: "error", category: "Corsi a Scelta", message: `CFU a scelta: ${freeChoiceCFU}. Massimo: ${FREE_CHOICE_CFU_RANGE[1]} CFU.` });
  }
  const outsideApprovedChoices = effectiveCourses.filter((c) => c.isElective && !APPROVED_FREE_CHOICE_GROUPS.includes(c.electiveGroup ?? "") && c.electiveGroup !== "TABA" && c.electiveGroup !== "PROBSTAT" && c.electiveGroup !== "TABREC" && c.code !== "093506");
  if (outsideApprovedChoices.length > 0) {
    issues.push({ id: "autonomous_plan", type: "warning", category: "Approvazione", message: "Il piano contiene scelte fuori dalle tabelle preapprovate: serve valutazione della commissione." });
  } else {
    issues.push({ id: "preapproved_choices", type: "info", category: "Approvazione", message: "Le scelte libere presenti sono in tabelle preapprovate o tirocinio: piano standard approvabile automaticamente se gli altri vincoli sono rispettati." });
  }

  // 10. Ministerial SSD/area ranges
  const byArea = sumCFUByMinisterialArea(effectiveCourses);
  const baseTotal = Object.values(byArea.base).reduce((a, b) => a + b, 0);
  Object.entries(BASE_AREA_RULES).forEach(([area, rule]) => {
    const cfu = byArea.base[area as keyof typeof byArea.base] ?? 0;
    if (cfu < rule.min || cfu > rule.max) {
      issues.push({ id: `base_area_${area}`, type: "error", category: "Aree di Base", message: `${rule.label}: ${cfu} CFU, intervallo richiesto ${rule.min}-${rule.max}.` });
    }
  });
  if (baseTotal < BASE_TOTAL_CFU_RANGE[0] || baseTotal > BASE_TOTAL_CFU_RANGE[1]) {
    issues.push({ id: "base_total_area", type: "error", category: "Aree di Base", message: `Totale attività di base: ${baseTotal} CFU, intervallo richiesto ${BASE_TOTAL_CFU_RANGE[0]}-${BASE_TOTAL_CFU_RANGE[1]}.` });
  }

  const characterizingTotal = Object.values(byArea.characterizing).reduce((a, b) => a + b, 0);
  Object.entries(CHARACTERIZING_AREA_RULES).forEach(([area, rule]) => {
    const cfu = byArea.characterizing[area as keyof typeof byArea.characterizing] ?? 0;
    if (cfu < rule.min || cfu > rule.max) {
      issues.push({ id: `characterizing_area_${area}`, type: "error", category: "Aree Caratterizzanti", message: `${rule.label}: ${cfu} CFU, intervallo richiesto ${rule.min}-${rule.max}.` });
    }
  });
  if (characterizingTotal < CHARACTERIZING_TOTAL_CFU_RANGE[0] || characterizingTotal > CHARACTERIZING_TOTAL_CFU_RANGE[1]) {
    issues.push({ id: "characterizing_total_area", type: "error", category: "Aree Caratterizzanti", message: `Totale attività caratterizzanti: ${characterizingTotal} CFU, intervallo richiesto ${CHARACTERIZING_TOTAL_CFU_RANGE[0]}-${CHARACTERIZING_TOTAL_CFU_RANGE[1]}.` });
  }

  // 11. Internship
  const internships = effectiveCourses.filter((c) => INTERNSHIP_COURSE_CODES.includes(c.code));
  if (internships.length > 1) {
    issues.push({ id: "internship_duplicate", type: "error", category: "Tirocinio", message: "Seleziona un solo tirocinio tra variante da 5 CFU e variante da 10 CFU." });
  }
  internships.forEach((internship) => {
    if (![5, 10].includes(internship.cfu)) {
      issues.push({ id: `internship_cfu_${internship.code}`, type: "error", category: "Tirocinio", message: `"${internship.name}" deve valere 5 o 10 CFU.` });
    }
    if (internship.cfu === 10) {
      issues.push({ id: "internship_lm_note", type: "warning", category: "Tirocinio", message: "Il tirocinio da 10 CFU può generare 5 CFU di obblighi aggiuntivi per l'accesso alla LM Computer Science and Engineering." });
    }
  });

  // 12. Elective group constraints
  const groupCounts = new Map<string, number>();
  effectiveCourses.forEach((course) => {
    if (!course.electiveGroup) return;
    groupCounts.set(course.electiveGroup, (groupCounts.get(course.electiveGroup) ?? 0) + 1);
  });
  const trackGroupMinimums: Record<Track, string[]> = {
    I3I: ["TABAUT", "TABINF", "TABING"],
    I3C: ["TABCOM", "TABGEN"],
  };
  trackGroupMinimums[track].forEach((group) => {
    if ((groupCounts.get(group) ?? 0) < 1) {
      issues.push({ id: `group_${group}_missing`, type: "error", category: `Gruppo ${group}`, message: `Scegli almeno un corso dal gruppo ${group}.` });
    }
  });

  // 13. Nota magistrale
  if (!allCodes.some((c) => NOTA_MAGISTRALE.MUST_HAVE.includes(c))) {
    issues.push({ id: "nota_magistrale_meccanica", type: "warning", category: "Nota Magistrale", message: '"Meccanica" non è nel piano: sarà obbligatoria come debito formativo alla LM-32.' });
  }
  if (!allCodes.some((c) => NOTA_MAGISTRALE.SHOULD_HAVE_ONE_OF.includes(c))) {
    issues.push({ id: "nota_magistrale_science", type: "warning", category: "Nota Magistrale", message: "Nessun corso tra Chimica, Misure, Fisica Tecnica, Onde EM, Elettromagnetismo nel piano." });
  }

  return issues;
}

export function validatePlanScenario(scenario: PlanScenario, context: PlanValidationContext): { issues: ValidationIssue[]; summary: PlanValidationSummary } {
  const issues: ValidationIssue[] = [];
  const effectiveEntries = scenario.entries.filter((entry) => entry.position === "effective");
  const effectiveCourses = coursesForEntries(effectiveEntries);
  const effectiveNonLinked = effectiveCourses.filter((course) => !course.isLinkedExam);
  const effectiveCodes = new Set(effectiveEntries.map((entry) => entry.courseCode));
  const pspa = PSPA_BY_TRACK[scenario.cycle.track];
  const approvalStatus = getApprovalStatus(scenario.entries);

  issues.push({
    id: "pspa_structure",
    type: "info",
    category: "PSPA",
    message: `Milano Leonardo in presenza: anno 1 ${pspa.year1}, anno 2 ${pspa.year2}, anno 3 ${pspa.year3}.`,
  });

  const annualFeeCfu = sumCFU(coursesForEntries(scenario.entries.filter((entry) =>
    entry.feeCounted &&
    (entry.courseYear === scenario.cycle.studentYear || ["carried_over", "recovery_reinserted"].includes(entry.origin))
  )).filter((course) => !course.isLinkedExam));
  if (annualFeeCfu < YEAR_CFU_RANGE[0]) {
    issues.push({ id: "annual_fee_cfu_low", type: "error", category: "CFU Anno", message: `CFU tassa/frequenza per l'anno ${scenario.cycle.studentYear}: ${annualFeeCfu}. Minimo ${YEAR_CFU_RANGE[0]}.` });
  }
  if (annualFeeCfu > YEAR_CFU_RANGE[1]) {
    issues.push({ id: "annual_fee_cfu_high", type: "error", category: "CFU Anno", message: `CFU tassa/frequenza per l'anno ${scenario.cycle.studentYear}: ${annualFeeCfu}. Massimo ${YEAR_CFU_RANGE[1]}.` });
  }

  const requiredReinsertions = getRequiredReinsertions(context.previousCompiledEntries, context.exams);
  const missingReinsertions = requiredReinsertions.filter((required) => !scenario.entries.some((entry) => isValidReinsertionEntry(entry, required.courseCode)));
  missingReinsertions.forEach((required) => {
    const course = getCourse(required.courseCode);
    issues.push({
      id: `reinsertion_missing_${required.courseCode}`,
      type: "error",
      category: "Reinserimenti",
      message: `"${course?.name ?? required.courseCode}" va reinserito dal piano ${required.sourceAcademicYear} perché non risulta superato e registrato.`,
    });
  });

  if (scenario.cycle.validationMode === "second_semester_revision") {
    validateSecondSemesterRevision(scenario, context.baseRevisionScenario, issues);
  }

  const total = sumCFU(effectiveNonLinked);
  if (total < TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_low", type: "error", category: "CFU Totali", message: `CFU effettivi totali: ${total} / ${TOTAL_CFU_REQUIRED}. Mancano ${TOTAL_CFU_REQUIRED - total} CFU.` });
  } else if (total > TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_high", type: "warning", category: "CFU Totali", message: `CFU effettivi totali: ${total}. Supera i ${TOTAL_CFU_REQUIRED} richiesti di ${total - TOTAL_CFU_REQUIRED} CFU.` });
  }

  const supernumeraryCfu = sumCFU(coursesForEntries(scenario.entries.filter((entry) => entry.position === "supernumerary")).filter((course) => !course.isLinkedExam));
  if (supernumeraryCfu > SUPERNUMERARY_CFU_MAX) {
    issues.push({ id: "soprannumero_high", type: "error", category: "Soprannumero", message: `CFU soprannumerari: ${supernumeraryCfu} / ${SUPERNUMERARY_CFU_MAX}.` });
  }

  const byCategory = sumCFUByCategory(effectiveNonLinked);
  Object.entries(CATEGORY_MINIMUMS).forEach(([cat, min]) => {
    const category = cat as ActivityCategory;
    if ((byCategory[category] ?? 0) < min) {
      issues.push({ id: `category_${cat}_low`, type: "error", category: "CFU per Categoria", message: `${CATEGORY_LABELS[cat]} (${cat}): ${byCategory[category] ?? 0} / ${min} CFU minimi richiesti.` });
    }
  });

  if ((byCategory.V ?? 0) !== FINAL_EXAM_CFU) {
    issues.push({ id: "final_exam_cfu", type: "error", category: "Prova Finale", message: `La Prova Finale deve valere ${FINAL_EXAM_CFU} CFU effettivi. Attualmente: ${byCategory.V ?? 0} CFU.` });
  }

  const tabaCourses = effectiveNonLinked.filter((c) => c.electiveGroup === "TABA");
  if (tabaCourses.length !== TABA_PICK_COUNT) {
    issues.push({ id: "taba_count", type: "error", category: "Gruppo TABA", message: `Scegli esattamente ${TABA_PICK_COUNT} corso dal gruppo TABA. Attualmente: ${tabaCourses.length}.` });
  }

  const probStatSelected = [...effectiveCodes].filter((code) => PROBSTAT_COURSE_CODES.includes(code));
  if (probStatSelected.length !== 1) {
    issues.push({ id: "probstat_count", type: "error", category: "Anno 2", message: `Scegli esattamente un corso tra Probabilità e Statistica e Informazione e Stima. Attualmente: ${probStatSelected.length}.` });
  }

  if (scenario.cycle.track === "I3I") {
    TABREC_COURSE_CODES.forEach((code) => {
      if (!effectiveCodes.has(code)) {
        const c = getCourse(code);
        issues.push({ id: `tabrec_missing_${code}`, type: "error", category: "TABREC", message: `"${c?.name}" è obbligatorio per I3I (TABREC).` });
      }
    });
  }
  if (scenario.cycle.track === "I3C") {
    I3C_REQUIRED_COURSE_CODES.forEach((code) => {
      if (!effectiveCodes.has(code)) {
        const c = getCourse(code);
        issues.push({ id: `i3c_required_missing_${code}`, type: "error", category: "I3C", message: `"${c?.name}" è obbligatorio per I3C.` });
      }
    });
  }

  effectiveNonLinked.forEach((course) => {
    if (!course.track || course.track === "both") return;
    if (course.track !== scenario.cycle.track) {
      issues.push({ id: `track_mismatch_${course.code}`, type: "warning", category: "Percorso", message: `"${course.name}" appartiene al percorso ${course.track}, ma lo scenario è ${scenario.cycle.track}.` });
    }
  });

  const freeChoiceCourses = effectiveNonLinked.filter((course) => activityCategoryForCourse(course) === "D");
  const freeChoiceCFU = sumCFU(freeChoiceCourses);
  if (freeChoiceCFU < FREE_CHOICE_CFU_RANGE[0] || freeChoiceCFU > FREE_CHOICE_CFU_RANGE[1]) {
    issues.push({ id: "free_choice_range", type: "error", category: "Corsi a Scelta", message: `CFU a scelta: ${freeChoiceCFU}. Intervallo richiesto ${FREE_CHOICE_CFU_RANGE[0]}-${FREE_CHOICE_CFU_RANGE[1]}.` });
  }

  if (approvalStatus === "needs_commission_review") {
    issues.push({ id: "autonomous_plan", type: "warning", category: "Approvazione", message: "Il piano contiene scelte fuori dalle tabelle preapprovate: serve valutazione della commissione." });
  } else {
    issues.push({ id: "preapproved_choices", type: "info", category: "Approvazione", message: "Le scelte libere presenti sono in tabelle preapprovate o tirocinio: scenario pronto per approvazione automatica se gli altri vincoli sono rispettati." });
  }

  const byArea = sumCFUByMinisterialArea(effectiveNonLinked);
  const baseTotal = Object.values(byArea.base).reduce((a, b) => a + b, 0);
  Object.entries(BASE_AREA_RULES).forEach(([area, rule]) => {
    const cfu = byArea.base[area as keyof typeof byArea.base] ?? 0;
    if (cfu < rule.min || cfu > rule.max) {
      issues.push({ id: `base_area_${area}`, type: "error", category: "Aree di Base", message: `${rule.label}: ${cfu} CFU, intervallo richiesto ${rule.min}-${rule.max}.` });
    }
  });
  if (baseTotal < BASE_TOTAL_CFU_RANGE[0] || baseTotal > BASE_TOTAL_CFU_RANGE[1]) {
    issues.push({ id: "base_total_area", type: "error", category: "Aree di Base", message: `Totale attività di base: ${baseTotal} CFU, intervallo richiesto ${BASE_TOTAL_CFU_RANGE[0]}-${BASE_TOTAL_CFU_RANGE[1]}.` });
  }

  const characterizingTotal = Object.values(byArea.characterizing).reduce((a, b) => a + b, 0);
  Object.entries(CHARACTERIZING_AREA_RULES).forEach(([area, rule]) => {
    const cfu = byArea.characterizing[area as keyof typeof byArea.characterizing] ?? 0;
    if (cfu < rule.min || cfu > rule.max) {
      issues.push({ id: `characterizing_area_${area}`, type: "error", category: "Aree Caratterizzanti", message: `${rule.label}: ${cfu} CFU, intervallo richiesto ${rule.min}-${rule.max}.` });
    }
  });
  if (characterizingTotal < CHARACTERIZING_TOTAL_CFU_RANGE[0] || characterizingTotal > CHARACTERIZING_TOTAL_CFU_RANGE[1]) {
    issues.push({ id: "characterizing_total_area", type: "error", category: "Aree Caratterizzanti", message: `Totale attività caratterizzanti: ${characterizingTotal} CFU, intervallo richiesto ${CHARACTERIZING_TOTAL_CFU_RANGE[0]}-${CHARACTERIZING_TOTAL_CFU_RANGE[1]}.` });
  }

  const internships = effectiveNonLinked.filter((course) => INTERNSHIP_COURSE_CODES.includes(course.code));
  if (internships.length > 1) {
    issues.push({ id: "internship_duplicate", type: "error", category: "Tirocinio", message: "Seleziona un solo tirocinio tra variante da 5 CFU e variante da 10 CFU." });
  }
  internships.forEach((internship) => {
    if (![5, 10].includes(internship.cfu)) {
      issues.push({ id: `internship_cfu_${internship.code}`, type: "error", category: "Tirocinio", message: `"${internship.name}" deve valere 5 o 10 CFU.` });
    }
    if (internship.cfu === 10) {
      issues.push({ id: "internship_lm_note", type: "warning", category: "Tirocinio", message: "Il tirocinio da 10 CFU può generare 5 CFU di obblighi aggiuntivi per l'accesso alla LM Computer Science and Engineering." });
    }
  });

  const groupCounts = new Map<string, number>();
  effectiveNonLinked.forEach((course) => {
    if (!course.electiveGroup) return;
    groupCounts.set(course.electiveGroup, (groupCounts.get(course.electiveGroup) ?? 0) + 1);
  });
  const trackGroupMinimums: Record<Track, string[]> = {
    I3I: ["TABAUT", "TABINF", "TABING"],
    I3C: ["TABCOM", "TABGEN"],
  };
  trackGroupMinimums[scenario.cycle.track].forEach((group) => {
    if ((groupCounts.get(group) ?? 0) < 1) {
      issues.push({ id: `group_${group}_missing`, type: "error", category: `Gruppo ${group}`, message: `Scegli almeno un corso dal gruppo ${group}.` });
    }
  });

  if (!effectiveCodes.has(NOTA_MAGISTRALE.MUST_HAVE[0])) {
    issues.push({ id: "nota_magistrale_meccanica", type: "warning", category: "Nota Magistrale", message: '"Meccanica" non è nel piano: sarà obbligatoria come debito formativo alla LM-32.' });
  }
  if (!NOTA_MAGISTRALE.SHOULD_HAVE_ONE_OF.some((code) => effectiveCodes.has(code))) {
    issues.push({ id: "nota_magistrale_science", type: "warning", category: "Nota Magistrale", message: "Nessun corso tra Chimica, Misure, Fisica Tecnica, Onde EM, Elettromagnetismo nel piano." });
  }

  const recoveredCfu = sumCFU(coursesForEntries(scenario.entries.filter((entry) =>
    !entry.feeCounted && ["carried_over", "recovery_reinserted"].includes(entry.origin)
  )).filter((course) => !course.isLinkedExam));

  issues.push({ id: "annual_fee_cfu_info", type: "info", category: "CFU Tassa", message: `CFU tassa/frequenza stimati per l'anno ${scenario.cycle.studentYear}: ${annualFeeCfu}.` });
  issues.push({ id: "recovered_cfu_info", type: "info", category: "Recuperi", message: `CFU recuperi scalati: ${recoveredCfu}.` });

  return {
    issues,
    summary: {
      totalEffectiveCfu: total,
      annualFeeCfu,
      recoveredCfu,
      supernumeraryCfu,
      approvalStatus,
    },
  };
}

export function getRequiredReinsertions(previousCompiledEntries: PreviousCompiledEntry[], exams: ExamsMap) {
  const required = new Map<string, { courseCode: string; sourceCycleId: number; sourceAcademicYear: string }>();
  previousCompiledEntries.forEach(({ cycle, entry }) => {
    const course = getCourse(entry.courseCode);
    if (!course || course.isLinkedExam || entry.position !== "effective") return;
    if (exams[entry.courseCode]?.status === "passed_registered") return;
    if (!cycle.id) return;
    if (!required.has(entry.courseCode)) {
      required.set(entry.courseCode, {
        courseCode: entry.courseCode,
        sourceCycleId: cycle.id,
        sourceAcademicYear: cycle.academicYear,
      });
    }
  });
  return Array.from(required.values());
}

export function isValidReinsertionEntry(entry: PlanEntry, courseCode: string): boolean {
  return entry.courseCode === courseCode
    && entry.position === "effective"
    && ["carried_over", "recovery_reinserted"].includes(entry.origin);
}

export function getApprovalStatus(entries: PlanEntry[]): ApprovalStatus {
  const courses = coursesForEntries(entries.filter((entry) => entry.position === "effective")).filter((course) => !course.isLinkedExam);
  const outsideApprovedChoices = courses.filter((course) =>
    course.isElective &&
    !APPROVED_FREE_CHOICE_GROUPS.includes(course.electiveGroup ?? "") &&
    course.electiveGroup !== "TABA" &&
    course.electiveGroup !== "PROBSTAT" &&
    course.electiveGroup !== "TABREC" &&
    course.code !== "093506"
  );
  return outsideApprovedChoices.length > 0 ? "needs_commission_review" : "auto_approved_after_deadline";
}

function validateSecondSemesterRevision(scenario: PlanScenario, baseScenario: PlanScenario | null | undefined, issues: ValidationIssue[]): void {
  if (!baseScenario) {
    issues.push({ id: "revision_no_base", type: "warning", category: "Revisione", message: "Modalità revisione attiva senza scenario base: controllo limitato alle regole generali." });
    return;
  }

  if (scenario.cycle.track !== baseScenario.cycle.track) {
    issues.push({ id: "revision_track_change", type: "error", category: "Revisione", message: "In revisione secondo semestre non è possibile cambiare PSPA/percorso." });
  }

  const baseCodes = new Set(baseScenario.entries.map((entry) => entry.courseCode));
  const currentCodes = new Set(scenario.entries.map((entry) => entry.courseCode));

  scenario.entries.forEach((entry) => {
    if (baseCodes.has(entry.courseCode)) return;
    const course = getCourse(entry.courseCode);
    if (course && course.semester !== 2) {
      issues.push({ id: `revision_add_${entry.courseCode}`, type: "error", category: "Revisione", message: `In revisione puoi aggiungere solo corsi del secondo semestre: "${course.name}" non lo è.` });
    }
  });

  baseScenario.entries.forEach((entry) => {
    if (currentCodes.has(entry.courseCode)) return;
    const course = getCourse(entry.courseCode);
    if (course && course.semester !== 2) {
      issues.push({ id: `revision_remove_${entry.courseCode}`, type: "error", category: "Revisione", message: `In revisione puoi rimuovere solo corsi del secondo semestre: "${course.name}" non lo è.` });
    }
  });
}

function coursesForEntries(entries: PlanEntry[]) {
  return entries
    .map((entry) => getCourse(entry.courseCode))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));
}
