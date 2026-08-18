/**
 * Spiegazioni in linguaggio semplice per la scelta di un insegnamento.
 *
 * Serve a rispondere, **prima** di aggiungere un corso al piano, alle domande che uno studente si
 * fa davvero: in che semestre è, quanti CFU vale, quale regola soddisfa, se occupa i CFU del
 * gruppo a scelta, se trascina un progetto, se è soltanto una scelta libera, se c'è una
 * limitazione da verificare.
 *
 * Tutto è derivato dal catalogo dell'anno e dalle sue regole: qui non è scritto nessun codice
 * insegnamento e nessuna soglia. Modulo puro.
 */

import {
  activityCategory,
  courseOfferings,
  findCourse,
  groupDescription,
  groupLabel,
  type Catalog,
  type Course,
  type CourseOffering,
  type CourseYear,
  type PlanRule,
} from "./catalog";
import { CATEGORY_LABELS, type ActivityCategory, type Track } from "./constraints";
import type { StructuralChoice } from "./structuralChoice";
import type { PlanValidationResult } from "./validation";

/**
 * Perché un insegnamento compare nell'elenco. L'ordine dei valori è anche l'ordine di priorità
 * con cui la UI raggruppa: prima ciò che è dovuto, poi ciò che è utile, infine ciò che è extra.
 */
export type CourseBucket =
  /** Obbligatorio per l'anno di corso che stai pianificando. */
  | "compulsory"
  /** Frequenza già acquisita e esame ancora aperto: va reinserito. */
  | "reinsertion"
  /** Scelta obbligata condizionata: va scelto ora nella tabella dei recuperi. */
  | "mandatory_choice"
  /** Fa parte del gruppo di CFU a scelta dell'anno. */
  | "choice_group"
  /** Consigliato dal piano preapprovato o utile per la magistrale. */
  | "recommended"
  /** Nessun obbligo di quest'anno: si aggiunge come extra o in soprannumero. */
  | "extra";

export const BUCKET_LABELS: Record<CourseBucket, string> = {
  compulsory: "Obbligatori di quest'anno",
  reinsertion: "Da reinserire",
  mandatory_choice: "Scelte obbligate da fare ora",
  choice_group: "Gruppo di CFU a scelta",
  recommended: "Consigliati e compatibili",
  extra: "Extra e soprannumero",
};

export const BUCKET_HINTS: Record<CourseBucket, string> = {
  compulsory: "Il piano preapprovato li prevede: senza di loro il piano non sta in piedi.",
  reinsertion: "Erano già nel tuo piano di un anno precedente e l'esame non è ancora verbalizzato.",
  mandatory_choice: "Il Regolamento li rende obbligatori adesso perché non li hai scelti prima.",
  choice_group: "Compongono il totale esatto di CFU a scelta dell'anno.",
  recommended: "Non obbligatori, ma consigliati dal Regolamento o utili per la magistrale.",
  extra: "Non servono a nessun obbligo di quest'anno: valgono come attività in più.",
};

export type CourseFact = { label: string; value: string };

export type CourseChoiceInfo = {
  code: string;
  name: string;
  cfu: number;
  /** Semestre dell'offerta pertinente per l'anno pianificato. */
  semester: 1 | 2;
  courseYear: CourseYear;
  category: ActivityCategory;
  categoryLabel: string;
  bucket: CourseBucket;
  /** Nome leggibile del gruppo/tabella, mai la sigla nuda. */
  group: string | null;
  groupExplanation: string | null;
  /** true quando i CFU dell'insegnamento entrano nel gruppo a scelta dell'anno. */
  countsTowardChoiceGroup: boolean;
  /** Regola che l'insegnamento contribuisce a soddisfare, in linguaggio semplice. */
  satisfies: string | null;
  /** Modulo di prova finale che viene aggiunto insieme al corso. */
  linkedModule: { code: string; name: string; cfu: number } | null;
  /** true quando non copre nessun obbligo: è solo una scelta libera. */
  isFreeChoiceOnly: boolean;
  /** Limitazioni o dati da verificare, in frasi complete. */
  limitations: string[];
  /** Righe pronte da mostrare nella scheda del corso. */
  facts: CourseFact[];
  /** Riassunto di una frase. */
  summary: string;
};

export type DescribeCoursesInput = {
  catalog: Catalog;
  track: Track;
  studentYear: CourseYear;
  /** Codici già presenti nel piano corrente. */
  inPlan: Set<string>;
  /** Codici già verbalizzati in carriera. */
  registered: Set<string>;
  /** Codici che il validatore chiede di reinserire. */
  reinsertionCodes: Set<string>;
  structuralChoices: StructuralChoice[];
  /** Se valorizzato, filtra le offerte a quel semestre (finestra di modifica semestrale). */
  restrictToSemester?: 1 | 2 | null;
};

const cfuText = (cfu: number): string => `${cfu} CFU`;
const semesterText = (semester: 1 | 2): string => `${semester}° semestre`;

function choiceRuleFor(catalog: Catalog, track: Track, studentYear: CourseYear) {
  return catalog.rules.find(
    (rule): rule is Extract<PlanRule, { kind: "choice_cfu" }> =>
      rule.kind === "choice_cfu"
      && (!rule.tracks || rule.tracks.includes(track))
      && rule.dueByYear <= studentYear
  );
}

/** Regole obbligatorie dell'anno che nominano esplicitamente un codice. */
function ruleCoverage(catalog: Catalog, track: Track, studentYear: CourseYear): Map<string, string> {
  const coverage = new Map<string, string>();
  const note = (code: string, text: string) => {
    if (!coverage.has(code)) coverage.set(code, text);
  };

  for (const rule of catalog.rules) {
    if ("tracks" in rule && rule.tracks && !rule.tracks.includes(track)) continue;
    if ("dueByYear" in rule && rule.dueByYear > studentYear) continue;

    switch (rule.kind) {
      case "required_all":
        for (const code of rule.codes) note(code, `È obbligatorio: ${rule.label}.`);
        break;
      case "exactly_one":
        for (const code of rule.codes) note(code, `Soddisfa "${rule.label}": ne serve esattamente uno.`);
        break;
      case "alternatives":
        for (const option of rule.options) {
          for (const code of option.requireAll) note(code, `Soddisfa "${rule.label}" nell'alternativa «${option.label}».`);
          for (const code of option.pickOneOf?.codes ?? []) {
            note(code, `Completa l'alternativa «${option.label}» di "${rule.label}".`);
          }
        }
        break;
      case "bundle_exactly_one":
        for (const bundle of rule.bundles) {
          for (const code of bundle.codes) note(code, `Fa parte del blocco «${bundle.label}» di "${rule.label}".`);
        }
        break;
      case "advisory_any_of":
        for (const code of rule.codes) note(code, rule.message);
        break;
      default:
        break;
    }
  }
  return coverage;
}

function pickOffering(course: Course, track: Track, studentYear: CourseYear, restrictToSemester?: 1 | 2 | null): CourseOffering | null {
  const offerings = courseOfferings(course).filter((offering) => offering.tracks.includes(track));
  const eligible = restrictToSemester ? offerings.filter((offering) => offering.semester === restrictToSemester) : offerings;
  if (eligible.length === 0) return null;
  return eligible.find((offering) => offering.year === studentYear) ?? eligible[0];
}

/**
 * Descrive tutti gli insegnamenti che si possono aggiungere al piano, già raggruppati e spiegati.
 * Esclude i moduli di prova finale, che seguono automaticamente il corso padre.
 */
export function describeAddableCourses(input: DescribeCoursesInput): CourseChoiceInfo[] {
  const { catalog, track, studentYear, inPlan, registered, reinsertionCodes, structuralChoices } = input;
  const choiceRule = choiceRuleFor(catalog, track, studentYear);
  const coverage = ruleCoverage(catalog, track, studentYear);
  const recommended = new Set(catalog.defaultNewFrequencies[track][studentYear] ?? []);
  const mandatoryChoices = new Map(
    structuralChoices
      .filter((choice) => choice.state === "choose_in_recovery_table")
      .map((choice) => [choice.courseCode, choice])
  );

  const described: CourseChoiceInfo[] = [];

  for (const course of catalog.courses) {
    if (course.isLinkedExam) continue;
    if (inPlan.has(course.code) || registered.has(course.code)) continue;
    const offering = pickOffering(course, track, studentYear, input.restrictToSemester);
    if (!offering) continue;

    const category = activityCategory(catalog, course.code, track, offering.year, offering.semester);
    const group = offering.group;
    const inChoiceGroup = Boolean(choiceRule && group !== null && choiceRule.groups.includes(group));
    const mandatoryChoice = mandatoryChoices.get(course.code);
    const satisfies = mandatoryChoice
      ? `Il Regolamento lo rende obbligatorio ora: non risulta scelto negli anni precedenti.`
      : coverage.get(course.code) ?? null;

    const bucket: CourseBucket = reinsertionCodes.has(course.code)
      ? "reinsertion"
      : mandatoryChoice
        ? "mandatory_choice"
        : offering.compulsory
          ? "compulsory"
          : inChoiceGroup
            ? "choice_group"
            : coverage.has(course.code) || recommended.has(course.code)
              ? offering.year === studentYear ? "compulsory" : "recommended"
              : offering.year === studentYear
                ? "recommended"
                : "extra";

    const linked = course.linkedExams[0] ?? null;
    const linkedInThisContext = linked && (offering.linkedModules?.includes(linked.code) ?? course.linkedExams.length > 0)
      ? { code: linked.code, name: linked.name, cfu: linked.cfu }
      : null;

    const limitations: string[] = [];
    if (course.enrolmentCapped) {
      limitations.push("Insegnamento a numero chiuso: l'accesso avviene inserendolo nel piano fino a esaurimento dei posti, e la disponibilità non è verificabile offline.");
    }
    if (catalog.dataStatus === "to_verify") {
      limitations.push(`Dati dell'AA ${catalog.academicYear} da riconfermare sul Regolamento definitivo.`);
    }
    if (linked && !linkedInThisContext) {
      limitations.push(`Nel contesto di questa tabella il Regolamento non associa il modulo "${linked.name}": verifica sui Servizi Online se va inserito.`);
    }
    if (mandatoryChoice?.inferredFromMissingHistory) {
      limitations.push("Non ho piani degli anni precedenti in archivio: che non sia stato scelto prima è una deduzione.");
    }

    const isFreeChoiceOnly = category === "D" && !satisfies && !offering.compulsory && !inChoiceGroup;

    const facts: CourseFact[] = [
      { label: "Semestre", value: semesterText(offering.semester) },
      { label: "CFU", value: cfuText(course.cfu) },
      { label: "Anno di corso", value: `anno ${offering.year}` },
      { label: "Tipo di attività", value: `${CATEGORY_LABELS[category] ?? category} (${category})` },
      {
        label: "Gruppo o regola",
        value: groupLabel(catalog, group) ?? (offering.compulsory ? "Insegnamento obbligatorio del piano" : "Fuori dalle tabelle a scelta"),
      },
      {
        label: "Conta nel gruppo a scelta",
        value: inChoiceGroup && choiceRule
          ? `Sì: occupa parte dei ${choiceRule.requiredCfu} CFU a scelta`
          : choiceRule
            ? `No: non tocca i ${choiceRule.requiredCfu} CFU a scelta`
            : "Non applicabile a questo anno",
      },
    ];
    if (linkedInThisContext) {
      facts.push({ label: "Progetto collegato", value: `${linkedInThisContext.name} (${cfuText(linkedInThisContext.cfu)}), aggiunto insieme` });
    }

    const summaryParts = [semesterText(offering.semester), cfuText(course.cfu)];
    if (group) summaryParts.push(groupLabel(catalog, group) as string);
    if (inChoiceGroup && choiceRule) summaryParts.push(`conta nei ${choiceRule.requiredCfu} CFU a scelta`);
    else if (isFreeChoiceOnly) summaryParts.push("solo scelta libera");

    described.push({
      code: course.code,
      name: course.name,
      cfu: course.cfu,
      semester: offering.semester,
      courseYear: offering.year,
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? category,
      bucket,
      group: groupLabel(catalog, group),
      groupExplanation: groupDescription(catalog, group),
      countsTowardChoiceGroup: inChoiceGroup,
      satisfies,
      linkedModule: linkedInThisContext,
      isFreeChoiceOnly,
      limitations,
      facts,
      summary: summaryParts.join(" · "),
    });
  }

  const order: CourseBucket[] = ["reinsertion", "mandatory_choice", "compulsory", "choice_group", "recommended", "extra"];
  return described.sort((a, b) =>
    order.indexOf(a.bucket) - order.indexOf(b.bucket)
    || a.semester - b.semester
    || a.name.localeCompare(b.name, "it")
  );
}

// ---------------------------------------------------------------------------
// Effetto di un'aggiunta
// ---------------------------------------------------------------------------

export type AdditionFeedback = { headline: string; details: string[] };

/**
 * Cosa è cambiato aggiungendo un insegnamento: quale regola si è chiusa, quanti CFU mancano
 * ancora al gruppo a scelta, e quando l'aggiunta non tocca quel gruppo. Si legge confrontando
 * due validazioni, quindi non duplica la logica delle regole.
 */
export function describeAdditionEffect(
  catalog: Catalog,
  code: string,
  before: PlanValidationResult,
  after: PlanValidationResult
): AdditionFeedback {
  const name = findCourse(catalog, code)?.name ?? code;
  const details: string[] = [];

  const beforeById = new Map(before.ruleFindings.map((finding) => [finding.ruleId, finding]));
  const nowSatisfied = after.ruleFindings.filter((finding) => {
    const previous = beforeById.get(finding.ruleId);
    return finding.dueNow && finding.satisfied && previous && !previous.satisfied;
  });
  for (const finding of nowSatisfied) details.push(`Hai coperto "${finding.label}".`);

  const choiceBefore = before.ruleFindings.find((finding) => finding.ruleId.includes("choice") && finding.dueNow);
  const choiceAfter = after.ruleFindings.find((finding) => finding.ruleId === choiceBefore?.ruleId);
  if (choiceBefore && choiceAfter) {
    const cfuOf = (finding: typeof choiceAfter) =>
      finding.reserved.reduce((total, item) => total + (findCourse(catalog, item)?.cfu ?? 0), 0);
    const gained = cfuOf(choiceAfter) - cfuOf(choiceBefore);
    if (gained === 0) {
      details.push("Questo non modifica i CFU del gruppo a scelta.");
    } else if (!choiceAfter.satisfied) {
      const match = /Mancano (\d+) CFU/.exec(choiceAfter.detail);
      details.push(match ? `Mancano ancora ${match[1]} CFU al gruppo a scelta.` : "Il gruppo a scelta non è ancora completo.");
    }
  }

  const newErrors = after.issues.filter((item) =>
    item.type === "error" && item.scope === "current_plan" && !before.issues.some((previous) => previous.id === item.id)
  );
  for (const error of newErrors.slice(0, 2)) details.push(`Attenzione: ${error.message}`);

  const deltaNew = after.summary.newFrequencyCfu - before.summary.newFrequencyCfu;
  const headline = deltaNew > 0
    ? `"${name}" aggiunto: +${deltaNew} CFU di nuova frequenza.`
    : `"${name}" aggiunto al piano.`;

  return { headline, details };
}
