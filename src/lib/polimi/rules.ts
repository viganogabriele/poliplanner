/**
 * Motore di valutazione delle regole strutturali, guidato dalla configurazione dichiarativa
 * del catalogo (`catalog.rules`). Nessun codice insegnamento è scritto qui.
 *
 * Una regola è soddisfatta se le attività richieste sono "coperte", dove coperto significa:
 * verbalizzato in carriera, dichiarato non richiesto, oppure presente nel piano annuale corrente.
 * Di conseguenza un esame già verbalizzato non viene mai richiesto di nuovo.
 *
 * Modulo puro: nessun accesso al database.
 */

import { courseCfu, courseGroupsForTrack, courseName, courseOfferings, findCourse } from "./catalog";
import type { Catalog, CourseYear, PlanRule, RuleProvenance } from "./catalog/types";
import type { PlanValidationMode, Track } from "./constraints";

export type RuleEvalContext = {
  catalog: Catalog;
  track: Track;
  studentYear: CourseYear;
  validationMode: PlanValidationMode;
  /** Verbalizzati ∪ non richiesti ∪ attività effettive del piano annuale. */
  covered: Set<string>;
  /** Solo le attività effettive del piano annuale corrente. */
  planEffective: Set<string>;
  /** Tutte le attività del piano, soprannumero compreso. */
  planAll: Set<string>;
  registered: Set<string>;
  /** CFU di attività fuori catalogo inserite nel piano. */
  externalChoiceCfu: number;
  /** Gruppo dell'offerta con cui ogni voce del piano è stata inserita. */
  groupByPlanCode: Map<string, string | null>;
};

export type RuleFinding = {
  ruleId: string;
  label: string;
  source: string;
  provenance: RuleProvenance;
  satisfied: boolean;
  /** true quando la regola è già esigibile per l'anno di corso pianificato. */
  dueNow: boolean;
  /** Codici richiesti e non ancora coperti. */
  missing: string[];
  /** Spiegazione in linguaggio semplice del problema, vuota se soddisfatta. */
  detail: string;
  /** Codici che questa regola "consuma": non possono contare due volte in altri gruppi. */
  reserved: string[];
  severityHint: "blocking" | "warning" | "advice";
};

const names = (catalog: Catalog, codes: string[]): string =>
  codes.map((code) => `${courseName(catalog, code)} (${code})`).join(", ");

function isDue(rule: PlanRule, track: Track, studentYear: CourseYear): { applies: boolean; dueNow: boolean } {
  if (!("dueByYear" in rule)) return { applies: true, dueNow: true };
  if (rule.tracks && !rule.tracks.includes(track)) return { applies: false, dueNow: false };
  return { applies: true, dueNow: rule.dueByYear <= studentYear };
}

function finding(partial: Omit<RuleFinding, "severityHint"> & { severityHint?: RuleFinding["severityHint"] }): RuleFinding {
  return {
    ...partial,
    severityHint: partial.severityHint ?? (partial.satisfied ? "advice" : partial.dueNow ? "blocking" : "advice"),
  };
}

/**
 * Insegnamenti del secondo semestre ancora disponibili nelle tabelle indicate.
 * Servono per capire se un ammanco può essere colmato nella finestra di modifica semestrale.
 */
function secondSemesterOptions(catalog: Catalog, track: Track, groups: string[], covered: Set<string>): number[] {
  const cfus: number[] = [];
  for (const course of catalog.courses) {
    if (covered.has(course.code)) continue;
    const matches = courseOfferings(course).some((offering) =>
      offering.tracks.includes(track) && offering.semester === 2 && offering.group !== null && groups.includes(offering.group)
    );
    if (matches) cfus.push(course.cfu);
  }
  return cfus;
}

/** Il totale mancante è componibile con i CFU disponibili? Le taglie sono poche e piccole. */
function isReachable(target: number, sizes: number[]): boolean {
  if (target <= 0) return true;
  const reachable = new Set<number>([0]);
  for (const size of sizes) {
    for (const value of [...reachable]) {
      const next = value + size;
      if (next === target) return true;
      if (next < target) reachable.add(next);
    }
  }
  return false;
}

/**
 * Valuta tutte le regole. I gruppi a scelta sono valutati in seconda passata perché devono
 * escludere le attività già "consumate" da blocchi e bundle obbligatori (evita doppi conteggi:
 * per esempio Logica e Algebra sostenuta nel blocco B1 non vale anche come 5 CFU a scelta).
 */
/**
 * Valuta tutte le regole. I gruppi a scelta sono valutati in seconda passata perché devono
 * escludere le attività già "consumate" da blocchi e bundle obbligatori (evita doppi conteggi:
 * per esempio Logica e Algebra sostenuta nel blocco B1 non vale anche come 5 CFU a scelta,
 * mentre la stessa Logica recuperata in TABREC al terzo anno contribuisce eccome).
 */
export function evaluateRules(context: RuleEvalContext): RuleFinding[] {
  const { catalog, track, studentYear } = context;
  const findings: RuleFinding[] = [];
  const reserved = new Set<string>();
  const choiceRules: Extract<PlanRule, { kind: "choice_cfu" }>[] = [];

  for (const rule of catalog.rules) {
    const { applies, dueNow } = isDue(rule, track, studentYear);
    if (!applies) continue;
    if (rule.kind === "choice_cfu") {
      choiceRules.push(rule);
      continue;
    }
    const result = evaluateStructuralRule(rule, context, dueNow);
    if (!result) continue;
    findings.push(result);
    for (const code of result.reserved) reserved.add(code);
  }

  for (const rule of choiceRules) {
    const { dueNow } = isDue(rule, track, studentYear);
    findings.push(evaluateChoiceRule(rule, context, dueNow, reserved));
  }

  return findings;
}

function evaluateStructuralRule(rule: PlanRule, context: RuleEvalContext, dueNow: boolean): RuleFinding | null {
  const { catalog, track, covered, planEffective, planAll, groupByPlanCode } = context;
  const base = { ruleId: rule.id, label: rule.label, source: rule.source, provenance: rule.provenance, dueNow };

  switch (rule.kind) {
    case "required_all": {
      const missing = rule.codes.filter((code) => !covered.has(code));
      return finding({
        ...base,
        satisfied: missing.length === 0,
        missing,
        reserved: rule.codes.filter((code) => covered.has(code)),
        detail: missing.length === 0 ? "" : `Manca ${names(catalog, missing)}.`,
      });
    }

    case "exactly_one": {
      const present = rule.codes.filter((code) => covered.has(code));
      if (present.length === 1) {
        return finding({ ...base, satisfied: true, missing: [], reserved: present, detail: "" });
      }
      if (present.length === 0) {
        return finding({
          ...base, satisfied: false, missing: rule.codes, reserved: [],
          detail: `Scegli esattamente una tra ${names(catalog, rule.codes)}.`,
        });
      }
      return finding({
        ...base, satisfied: false, missing: [], reserved: present, severityHint: "warning",
        detail: `Risultano ${present.length} attività dove ne serve una sola: ${names(catalog, present)}. Se le hai sostenute entrambe, una vale come soprannumero o come scelta.`,
      });
    }

    case "alternatives": {
      const evaluated = rule.options.map((option) => {
        const missingAll = option.requireAll.filter((code) => !covered.has(code));
        const picked = option.pickOneOf ? option.pickOneOf.codes.filter((code) => covered.has(code)) : [];
        const pickSatisfied = !option.pickOneOf || picked.length >= option.pickOneOf.count;
        return { option, missingAll, picked, satisfied: missingAll.length === 0 && pickSatisfied };
      });
      const satisfiedOption = evaluated.find((candidate) => candidate.satisfied);
      if (satisfiedOption) {
        const limit = satisfiedOption.option.pickOneOf?.count ?? 0;
        const overPicked = Boolean(satisfiedOption.option.pickOneOf) && satisfiedOption.picked.length > limit;
        return finding({
          ...base,
          satisfied: !overPicked,
          missing: [],
          reserved: [...satisfiedOption.option.requireAll, ...satisfiedOption.picked.slice(0, limit)],
          severityHint: overPicked ? "warning" : "advice",
          detail: overPicked
            ? `Nel blocco "${satisfiedOption.option.label}" risultano ${satisfiedOption.picked.length} scelte dove ne serve ${limit}: ${names(catalog, satisfiedOption.picked)}. I CFU in più valgono come scelta o soprannumero.`
            : "",
        });
      }
      const best = evaluated.reduce((a, b) => (a.missingAll.length <= b.missingAll.length ? a : b));
      return finding({
        ...base, satisfied: false, missing: best.missingAll, reserved: [],
        detail: `Nessuna alternativa è completa. Devi scegliere: ${rule.options.map((option) => option.label).join(" oppure ")}.`,
      });
    }

    case "bundle_exactly_one": {
      const evaluated = rule.bundles.map((bundle) => ({
        bundle,
        present: bundle.codes.filter((code) => covered.has(code)),
        missing: bundle.codes.filter((code) => !covered.has(code)),
      }));
      const complete = evaluated.filter((candidate) => candidate.missing.length === 0);
      const partial = evaluated.filter((candidate) => candidate.missing.length > 0 && candidate.present.length > 0);

      if (complete.length >= 1 && partial.length === 0) {
        return finding({
          ...base,
          satisfied: complete.length === 1,
          missing: [], reserved: complete[0].bundle.codes,
          severityHint: complete.length === 1 ? "advice" : "warning",
          detail: complete.length === 1
            ? ""
            : `Risultano completi più blocchi alternativi: ${complete.map((candidate) => candidate.bundle.label).join(", ")}. Solo uno può contare come effettivo.`,
        });
      }
      if (complete.length >= 1 && partial.length > 0) {
        return finding({
          ...base, satisfied: false,
          missing: partial.flatMap((candidate) => candidate.missing),
          reserved: complete[0].bundle.codes,
          severityHint: "warning",
          detail: `Il blocco "${complete[0].bundle.label}" è completo, ma risultano anche attività isolate di "${partial[0].bundle.label}" (${names(catalog, partial[0].present)}): non sono ammesse combinazioni miste nel piano preapprovato.`,
        });
      }
      if (partial.length > 0) {
        const worst = partial[0];
        return finding({
          ...base, satisfied: false, missing: worst.missing, reserved: [],
          detail: `Il blocco "${worst.bundle.label}" è incompleto: manca ${names(catalog, worst.missing)}.`,
        });
      }
      return finding({
        ...base, satisfied: false, missing: rule.bundles[0].codes, reserved: [],
        detail: `Scegli un blocco completo tra: ${rule.bundles.map((bundle) => bundle.label).join(" oppure ")}.`,
      });
    }

    case "recovery_required": {
      const missing = rule.codes.filter((code) => !covered.has(code));
      const cfu = missing.reduce((total, code) => total + courseCfu(catalog, code), 0);
      return finding({
        ...base,
        satisfied: missing.length === 0,
        missing, reserved: [],
        detail: missing.length === 0
          ? ""
          : `Il percorso ${track} richiede ${names(catalog, missing)}: se non l'hai già verbalizzato va inserito come recupero. Quei ${cfu} CFU contano dentro il gruppo a scelta.`,
      });
    }

    case "linked_modules": {
      // L'associazione corso → modulo è attestata solo nei contesti indicati dal Manifesto.
      // Fuori da quelli (tipicamente un recupero TABREC) diventa una verifica, non un obbligo.
      const attestedMissing: string[] = [];
      const uncertain: { module: string; parent: string; note?: string }[] = [];
      const orphans: string[] = [];

      for (const pair of rule.pairs) {
        const parentInPlan = planEffective.has(pair.parent);
        const moduleSettled = planAll.has(pair.module) || covered.has(pair.module);
        if (parentInPlan && !moduleSettled) {
          const parentGroup = groupByPlanCode.get(pair.parent) ?? null;
          const attested = pair.attestedGroups === null || (parentGroup !== null && pair.attestedGroups.includes(parentGroup));
          if (attested) attestedMissing.push(pair.module);
          else uncertain.push({ module: pair.module, parent: pair.parent, note: pair.note });
        }
        if (planAll.has(pair.module) && !planAll.has(pair.parent) && !covered.has(pair.parent)) orphans.push(pair.module);
      }

      if (attestedMissing.length === 0 && orphans.length === 0 && uncertain.length > 0) {
        const first = uncertain[0];
        return finding({
          ...base,
          provenance: "operational_to_verify",
          source: `${rule.source}; contesto di recupero non attestato`,
          satisfied: false,
          missing: [],
          reserved: [],
          severityHint: "warning",
          detail: `${courseName(catalog, first.parent)} è nel piano come recupero e il Manifesto non associa il modulo "${courseName(catalog, first.module)}" a quel contesto. ${first.note ?? ""} Verifica sui Servizi Online se il modulo va reinserito.`.trim(),
        });
      }

      const parts: string[] = [];
      if (attestedMissing.length) parts.push(`Aggiungi il modulo di prova finale collegato: ${names(catalog, attestedMissing)}.`);
      if (orphans.length) parts.push(`Questi moduli di prova finale non hanno il corso collegato nel piano: ${names(catalog, orphans)}.`);
      if (uncertain.length) parts.push(`Da verificare sui Servizi Online: ${names(catalog, uncertain.map((item) => item.module))} per i corsi recuperati.`);

      return finding({
        ...base,
        satisfied: attestedMissing.length === 0 && orphans.length === 0 && uncertain.length === 0,
        missing: attestedMissing,
        reserved: [],
        severityHint: attestedMissing.length || orphans.length ? (dueNow ? "blocking" : "advice") : "warning",
        detail: parts.join(" "),
      });
    }

    case "single_instance": {
      const selected = rule.codes.filter((code) => planAll.has(code));
      const satisfied = selected.length <= rule.maxSelected;
      return finding({
        ...base, satisfied, missing: [], reserved: [],
        detail: satisfied ? "" : `Puoi inserire al massimo ${rule.maxSelected} istanza tra ${names(catalog, rule.codes)}; nel piano ce ne sono ${selected.length}.`,
      });
    }

    case "advisory_any_of": {
      const satisfied = rule.codes.some((code) => covered.has(code));
      return finding({
        ...base, satisfied, missing: satisfied ? [] : rule.codes, reserved: [],
        severityHint: "advice",
        detail: satisfied ? "" : rule.message,
      });
    }

    default:
      return null;
  }
}

/**
 * Gruppo a scelta. Il totale esatto è attestato dal Manifesto, ma **quando** va raggiunto non lo è:
 * le tabelle contengono insegnamenti del secondo semestre, che la finestra di modifica semestrale
 * permette di aggiungere. Un ammanco colmabile con corsi del secondo semestre è quindi un avviso
 * operativo, non un errore bloccante.
 */
function evaluateChoiceRule(
  rule: Extract<PlanRule, { kind: "choice_cfu" }>,
  context: RuleEvalContext,
  dueNow: boolean,
  reserved: Set<string>
): RuleFinding {
  const { catalog, track, covered, externalChoiceCfu, validationMode } = context;
  const counted: string[] = [];
  let cfu = 0;
  for (const code of covered) {
    if (reserved.has(code) || !findCourse(catalog, code)) continue;
    const groups = courseGroupsForTrack(catalog, code, track);
    if (!groups.some((group) => rule.groups.includes(group))) continue;
    counted.push(code);
    cfu += courseCfu(catalog, code);
  }
  if (rule.countsExternal) cfu += externalChoiceCfu;

  const base = { ruleId: rule.id, label: rule.label, source: rule.source, provenance: rule.provenance, dueNow, reserved: counted, missing: [] as string[] };
  const shortfall = rule.requiredCfu - cfu;

  if (shortfall === 0) return finding({ ...base, satisfied: true, detail: "" });

  if (shortfall < 0) {
    return finding({
      ...base, satisfied: false,
      detail: `Le tabelle ${rule.groups.join(", ")} devono totalizzare esattamente ${rule.requiredCfu} CFU: ce ne sono ${-shortfall} in più. I CFU eccedenti vanno messi in soprannumero.`,
    });
  }

  const canFinishLater = rule.completableInSecondSemesterWindow
    && isReachable(shortfall, secondSemesterOptions(catalog, track, rule.groups, covered));

  if (!canFinishLater) {
    return finding({
      ...base, satisfied: false,
      detail: `Mancano ${shortfall} CFU al gruppo da ${rule.requiredCfu} CFU (${rule.groups.join(", ")}) e non sono colmabili con insegnamenti del secondo semestre: vanno inseriti in questa presentazione.`,
    });
  }

  const lastWindow = validationMode === "second_semester_revision";
  return finding({
    ...base,
    satisfied: false,
    severityHint: "warning",
    provenance: "operational_to_verify",
    source: `${rule.source}; §2.4 – la modifica del secondo semestre consente di aggiungere insegnamenti del 2° semestre. Finestre e scadenze da verificare sui Servizi Online`,
    detail: lastWindow
      ? `Mancano ${shortfall} CFU al gruppo da ${rule.requiredCfu} CFU. Sei nella finestra di modifica del secondo semestre: puoi completarlo ora con insegnamenti del 2° semestre, ma è l'ultima occasione utile.`
      : `Mancano ${shortfall} CFU al gruppo da ${rule.requiredCfu} CFU. Non è un errore: puoi completarlo adesso oppure nella finestra di modifica del secondo semestre, aggiungendo insegnamenti del 2° semestre delle tabelle ${rule.groups.join(", ")}.`,
  });
}
