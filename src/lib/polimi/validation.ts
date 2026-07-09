import { getCourse } from "./courses";
import {
  TOTAL_CFU_REQUIRED, CATEGORY_MINIMUMS, FREE_CHOICE_CFU_RANGE,
  YEAR_CFU_RANGE, TABA_PICK_COUNT, APPROVED_FREE_CHOICE_GROUPS,
  TABREC_COURSE_CODES, NOTA_MAGISTRALE,
} from "./constraints";
import { sumCFUByCategory, cfuPerYear, allPlanoCodes, sumCFU } from "./cfuCalc";
import type { Track } from "./constraints";
import type { Piano } from "@/lib/piano";

export type ValidationIssue = {
  id: string;
  type: "error" | "warning" | "info";
  category: string;
  message: string;
};

export function validatePlan(piano: Piano, track: Track): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allCodes = allPlanoCodes(piano);
  const allCourses = allCodes.map(getCourse).filter((c): c is NonNullable<typeof c> => !!c && !c.isLinkedExam);

  // 1. Total CFU
  const total = allCourses.reduce((s, c) => s + c.cfu, 0);
  if (total < TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_low", type: "error", category: "CFU Totali", message: `CFU totali: ${total} / ${TOTAL_CFU_REQUIRED}. Mancano ${TOTAL_CFU_REQUIRED - total} CFU.` });
  } else if (total > TOTAL_CFU_REQUIRED) {
    issues.push({ id: "total_cfu_high", type: "warning", category: "CFU Totali", message: `CFU totali: ${total} (supera i ${TOTAL_CFU_REQUIRED} richiesti di ${total - TOTAL_CFU_REQUIRED} CFU).` });
  }

  // 2. Per-category minimums
  const byCategory = sumCFUByCategory(allCourses);
  const catLabels: Record<string, string> = { A: "discipline di base (A)", B: "discipline caratterizzanti (B)", C: "discipline affini/integrative (C)" };
  Object.entries(CATEGORY_MINIMUMS).forEach(([cat, min]) => {
    if ((byCategory[cat] ?? 0) < min) {
      issues.push({ id: `category_${cat}_low`, type: "error", category: "CFU per Categoria", message: `${catLabels[cat]}: ${byCategory[cat] ?? 0} / ${min} CFU minimi richiesti.` });
    }
  });

  // 3. Final exam
  if (!allCodes.includes("FINALE")) {
    issues.push({ id: "no_final_exam", type: "error", category: "Prova Finale", message: "La Prova Finale (5 CFU) è obbligatoria e non è nel piano." });
  }

  // 4. Per-year CFU range
  const yearCFU = cfuPerYear(piano);
  ([1, 2, 3] as const).forEach((y) => {
    const cfu = yearCFU[y] ?? 0;
    if (piano[y].courses.length === 0) return;
    if (cfu < YEAR_CFU_RANGE[0]) {
      issues.push({ id: `year_${y}_cfu_low`, type: "warning", category: `Anno ${y}`, message: `Anno ${y}: ${cfu} CFU (minimo ${YEAR_CFU_RANGE[0]} CFU per anno).` });
    }
    if (cfu > YEAR_CFU_RANGE[1]) {
      issues.push({ id: `year_${y}_cfu_high`, type: "error", category: `Anno ${y}`, message: `Anno ${y}: ${cfu} CFU supera il limite di ${YEAR_CFU_RANGE[1]} CFU.` });
    }
  });

  // 5. TABA rule
  const tabaCourses = allCourses.filter((c) => c.electiveGroup === "TABA");
  if (tabaCourses.length < TABA_PICK_COUNT) {
    issues.push({ id: "taba_missing", type: "error", category: "Gruppo TABA", message: `Scegli esattamente ${TABA_PICK_COUNT} corso dal gruppo TABA. Attualmente: ${tabaCourses.length}.` });
  } else if (tabaCourses.length > TABA_PICK_COUNT) {
    issues.push({ id: "taba_excess", type: "error", category: "Gruppo TABA", message: `Hai selezionato ${tabaCourses.length} corsi dal gruppo TABA, consentito solo ${TABA_PICK_COUNT}.` });
  }

  // 6. Probabilità/Statistica
  const probStatSelected = allCodes.filter((c) => ["099319", "054304"].includes(c));
  if (probStatSelected.length === 0) {
    issues.push({ id: "probstat_missing", type: "error", category: "Anno 2", message: 'Scegli uno tra "Probabilità e Statistica" e "Informazione e Stima".' });
  } else if (probStatSelected.length > 1) {
    issues.push({ id: "probstat_both", type: "warning", category: "Anno 2", message: 'Hai selezionato sia "Probabilità e Statistica" sia "Informazione e Stima". Uno sarà in soprannumero.' });
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

  // 8. Track mixing
  allCourses.forEach((c) => {
    if (!c.track || c.track === "both" || c.track === null) return;
    if (c.track !== track) {
      issues.push({ id: `track_mismatch_${c.code}`, type: "warning", category: "Percorso", message: `"${c.name}" appartiene al percorso ${c.track}, ma stai pianificando ${track}.` });
    }
  });

  // 9. Free-choice CFU
  const freeChoiceCourses = allCourses.filter((c) => c.isElective && APPROVED_FREE_CHOICE_GROUPS.includes(c.electiveGroup ?? "") && !c.isCompulsory);
  const freeChoiceCFU = sumCFU(freeChoiceCourses);
  if (freeChoiceCFU < FREE_CHOICE_CFU_RANGE[0]) {
    issues.push({ id: "free_choice_low", type: "warning", category: "Corsi a Scelta", message: `CFU a scelta: ${freeChoiceCFU}. Minimo: ${FREE_CHOICE_CFU_RANGE[0]} CFU.` });
  }
  if (freeChoiceCFU > FREE_CHOICE_CFU_RANGE[1]) {
    issues.push({ id: "free_choice_high", type: "warning", category: "Corsi a Scelta", message: `CFU a scelta: ${freeChoiceCFU}. Massimo consigliato: ${FREE_CHOICE_CFU_RANGE[1]} CFU.` });
  }

  // 10. Nota magistrale
  if (!allCodes.some((c) => NOTA_MAGISTRALE.MUST_HAVE.includes(c))) {
    issues.push({ id: "nota_magistrale_meccanica", type: "warning", category: "Nota Magistrale", message: '"Meccanica" non è nel piano: sarà obbligatoria come debito formativo alla LM-32.' });
  }
  if (!allCodes.some((c) => NOTA_MAGISTRALE.SHOULD_HAVE_ONE_OF.includes(c))) {
    issues.push({ id: "nota_magistrale_science", type: "warning", category: "Nota Magistrale", message: "Nessun corso tra Chimica, Misure, Fisica Tecnica, Onde EM, Elettromagnetismo nel piano." });
  }

  return issues;
}
