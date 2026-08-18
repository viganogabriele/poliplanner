/**
 * Motore di valutazione delle regole strutturali, guidato dalla configurazione dichiarativa
 * del catalogo (`catalog.rules`). Nessun codice insegnamento e nessuna soglia è scritta qui.
 *
 * Due invarianti governano tutto il modulo:
 *
 * 1. **Una regola non ancora esigibile non è mai un problema del piano corrente.** Se il vincolo
 *    scatta a un anno di corso successivo a quello che si sta pianificando, la segnalazione resta
 *    un'informazione sul futuro: non diventa né errore né avviso. Uno studente del primo anno non
 *    deve leggere "Attenzione" per il gruppo da 15 CFU del terzo.
 * 2. **Un'attività conta in un gruppo a scelta solo nel contesto in cui è stata scelta.** Non basta
 *    che l'insegnamento compaia da qualche parte in quella tabella: conta il gruppo con cui è
 *    entrato nel piano o nella carriera. Logica e Algebra scelta nel blocco del secondo anno e non
 *    verbalizzata resta un reinserimento di quel blocco; la stessa Logica scelta al terzo anno
 *    nella tabella dei recuperi pesa sui 15 CFU.
 *
 * Una regola è soddisfatta se le attività richieste sono "coperte", dove coperto significa:
 * verbalizzato in carriera, dichiarato non richiesto, oppure presente nel piano annuale corrente.
 * Di conseguenza un esame già verbalizzato non viene mai richiesto di nuovo.
 *
 * Modulo puro: nessun accesso al database.
 */

import { courseCfu, courseName, courseOfferings, findCourse, groupLabel, groupLabelList } from "./catalog";
import type { Catalog, CourseYear, PlanRule, RuleProvenance } from "./catalog/types";
import type { PlanValidationMode, Track } from "./constraints";
import type { StructuralChoice } from "./structuralChoice";

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
  /**
   * Gruppo in cui ogni attività coperta risulta **effettivamente scelta**: dal piano corrente,
   * dallo storico dei piani compilati o, in mancanza, dall'unica offerta possibile.
   * `null` quando il contesto non è determinabile: in quel caso l'attività non viene attribuita
   * a nessun gruppo a scelta, invece di essere contata a caso.
   */
  coverageGroup: Map<string, string | null>;
  /** Stato delle scelte obbligate condizionate ("se non scelto al secondo anno..."). */
  structuralChoices: StructuralChoice[];
};

export type RuleFinding = {
  ruleId: string;
  label: string;
  source: string;
  provenance: RuleProvenance;
  satisfied: boolean;
  /** true quando la regola è già esigibile per l'anno di corso pianificato. */
  dueNow: boolean;
  /** Anno di corso entro cui la regola va soddisfatta, se la regola lo dichiara. */
  dueByYear: CourseYear | null;
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

type Applicability = { applies: boolean; dueNow: boolean; dueByYear: CourseYear | null };

function isDue(rule: PlanRule, track: Track, studentYear: CourseYear): Applicability {
  if (!("dueByYear" in rule)) return { applies: true, dueNow: true, dueByYear: null };
  if (rule.tracks && !rule.tracks.includes(track)) return { applies: false, dueNow: false, dueByYear: rule.dueByYear };
  return { applies: true, dueNow: rule.dueByYear <= studentYear, dueByYear: rule.dueByYear };
}

/**
 * Costruisce il risultato applicando l'invariante 1: fuori dall'anno di esigibilità la gravità
 * viene abbassata a "informazione", qualunque cosa abbia chiesto il singolo ramo di valutazione.
 */
function finding(
  partial: Omit<RuleFinding, "severityHint"> & { severityHint?: RuleFinding["severityHint"] }
): RuleFinding {
  const requested = partial.severityHint ?? (partial.satisfied ? "advice" : "blocking");
  return { ...partial, severityHint: partial.dueNow ? requested : "advice" };
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

type Discharge = { codes: string[]; recoveryLabel: string; recoverySource: string };

/**
 * Regole del biennio assolte dalla via alternativa della tabella di recupero.
 *
 * Il Regolamento dà due strade per lo stesso obbligo: scegliere l'insegnamento nel blocco del
 * secondo anno, oppure — se non lo si è scelto — nella tabella di recupero al terzo. Chi prende la
 * seconda strada ha adempiuto: pretendere ancora il blocco del secondo anno, e con esso il modulo
 * di progetto da 1 CFU che le tabelle del terzo anno non elencano, sarebbe un errore inventato.
 *
 * Il collegamento è dichiarato nel catalogo (`dischargesRuleIds`): qui non c'è nessun codice.
 */
function recoveryDischarges(context: RuleEvalContext): Map<string, Discharge> {
  const discharges = new Map<string, Discharge>();
  const onRecoveryPath = new Set(
    context.structuralChoices
      .filter((choice) => choice.state === "choose_in_recovery_table")
      .map((choice) => choice.courseCode)
  );
  if (onRecoveryPath.size === 0) return discharges;

  const byId = new Map(context.catalog.rules.map((rule) => [rule.id, rule]));

  for (const rule of context.catalog.rules) {
    if (rule.kind !== "recovery_required" || !rule.dischargesRuleIds) continue;
    if (rule.tracks && !rule.tracks.includes(context.track)) continue;
    for (const targetId of rule.dischargesRuleIds) {
      const target = byId.get(targetId);
      if (!target) continue;
      const targetCodes = ruleCodes(target);
      const covering = rule.codes.filter((code) => onRecoveryPath.has(code) && targetCodes.includes(code));
      if (covering.length === 0) continue;
      const existing = discharges.get(targetId);
      discharges.set(targetId, {
        codes: [...(existing?.codes ?? []), ...covering],
        recoveryLabel: rule.label,
        recoverySource: rule.source,
      });
    }
  }
  return discharges;
}

/** Tutti i codici nominati da una regola, indipendentemente dalla sua forma. */
function ruleCodes(rule: PlanRule): string[] {
  switch (rule.kind) {
    case "required_all":
    case "exactly_one":
    case "recovery_required":
    case "single_instance":
    case "advisory_any_of":
      return rule.codes;
    case "alternatives":
      return rule.options.flatMap((option) => [...option.requireAll, ...(option.pickOneOf?.codes ?? [])]);
    case "bundle_exactly_one":
      return rule.bundles.flatMap((bundle) => bundle.codes);
    case "linked_modules":
      return rule.pairs.flatMap((pair) => [pair.parent, pair.module]);
    default:
      return [];
  }
}

/**
 * Riscrive un esito non soddisfatto quando l'obbligo è stato assolto per via della tabella di
 * recupero. Non è un errore, e non è nemmeno pienamente documentato: il Regolamento indica la
 * tabella di recupero per l'insegnamento, ma non dice come si completino gli eventuali CFU
 * residui del blocco del secondo anno. Resta quindi una verifica, dichiarata come tale.
 */
function applyDischarge(finding: RuleFinding, discharge: Discharge, catalog: Catalog): RuleFinding {
  const stillMissing = finding.missing.filter((code) => !discharge.codes.includes(code));
  return {
    ...finding,
    satisfied: true,
    missing: [],
    severityHint: "advice",
    provenance: "operational_to_verify",
    source: `${finding.source}; assolto da: ${discharge.recoverySource}`,
    detail: `Questo blocco del secondo anno è assolto scegliendo ${names(catalog, discharge.codes)} nella tabella di recupero del terzo anno, come previsto da "${discharge.recoveryLabel}". `
      + (stillMissing.length > 0
        ? `Le tabelle del terzo anno elencano quell'insegnamento senza ${names(catalog, stillMissing)}: verifica sui Servizi Online se ti viene richiesto comunque.`
        : "Le tabelle del terzo anno non richiedono il modulo di progetto associato al blocco del secondo anno."),
  };
}

/**
 * Valuta tutte le regole. I gruppi a scelta sono valutati in seconda passata perché devono
 * conoscere le attività già "consumate" dai blocchi obbligatori.
 */
export function evaluateRules(context: RuleEvalContext): RuleFinding[] {
  const { catalog, track, studentYear } = context;
  const findings: RuleFinding[] = [];
  const choiceRules: Extract<PlanRule, { kind: "choice_cfu" }>[] = [];
  const discharges = recoveryDischarges(context);

  for (const rule of catalog.rules) {
    const applicability = isDue(rule, track, studentYear);
    if (!applicability.applies) continue;
    if (rule.kind === "choice_cfu") {
      choiceRules.push(rule);
      continue;
    }
    const result = evaluateStructuralRule(rule, context, applicability);
    if (!result) continue;
    const discharge = discharges.get(rule.id);
    findings.push(!result.satisfied && discharge ? applyDischarge(result, discharge, catalog) : result);
  }

  // I gruppi a scelta arrivano dopo perché leggono il contesto di copertura completo, incluse
  // le voci che i blocchi obbligatori hanno già collocato altrove.
  for (const rule of choiceRules) {
    findings.push(evaluateChoiceRule(rule, context, isDue(rule, track, studentYear)));
  }

  return findings;
}

function evaluateStructuralRule(
  rule: PlanRule,
  context: RuleEvalContext,
  applicability: Applicability
): RuleFinding | null {
  const { catalog, covered, planEffective, planAll, groupByPlanCode } = context;
  const base = {
    ruleId: rule.id,
    label: rule.label,
    source: rule.source,
    provenance: rule.provenance,
    dueNow: applicability.dueNow,
    dueByYear: applicability.dueByYear,
  };

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

    case "recovery_required":
      return evaluateConditionalChoiceRule(rule, context, applicability);

    case "linked_modules": {
      // L'associazione corso → modulo è attestata solo nei contesti indicati dal Manifesto.
      // Fuori da quelli (tipicamente una scelta nella tabella dei recuperi) diventa una verifica.
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
          source: `${rule.source}; contesto della tabella di recupero non attestato`,
          satisfied: false,
          missing: [],
          reserved: [],
          severityHint: "warning",
          detail: `${courseName(catalog, first.parent)} è nel piano come scelta della tabella di recupero e il Regolamento non associa il modulo "${courseName(catalog, first.module)}" a quel contesto. ${first.note ?? ""} Verifica sui Servizi Online se il modulo va inserito.`.trim(),
        });
      }

      const parts: string[] = [];
      if (attestedMissing.length) parts.push(`Aggiungi il modulo di prova finale collegato: ${names(catalog, attestedMissing)}.`);
      if (orphans.length) parts.push(`Questi moduli di prova finale non hanno il corso collegato nel piano: ${names(catalog, orphans)}.`);
      if (uncertain.length) parts.push(`Da verificare sui Servizi Online: ${names(catalog, uncertain.map((item) => item.module))} per i corsi scelti nella tabella di recupero.`);

      return finding({
        ...base,
        satisfied: attestedMissing.length === 0 && orphans.length === 0 && uncertain.length === 0,
        missing: attestedMissing,
        reserved: [],
        severityHint: attestedMissing.length || orphans.length ? "blocking" : "warning",
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
 * Scelta obbligata condizionata: «se non scelto al secondo anno deve essere scelto al terzo».
 *
 * La regola distingue esplicitamente i due stati, perché portano a decisioni opposte:
 * un reinserimento non consuma i CFU del gruppo a scelta, una scelta nella tabella di recupero sì.
 * Lo stato arriva già classificato dal contesto: qui si formula solo la spiegazione.
 */
function evaluateConditionalChoiceRule(
  rule: Extract<PlanRule, { kind: "recovery_required" }>,
  context: RuleEvalContext,
  applicability: Applicability
): RuleFinding {
  const { catalog, covered, planAll, structuralChoices } = context;
  const relevant = structuralChoices.filter((choice) => choice.ruleId === rule.id);
  const base = {
    ruleId: rule.id,
    label: rule.label,
    source: rule.source,
    provenance: rule.provenance,
    dueNow: applicability.dueNow,
    dueByYear: applicability.dueByYear,
  };

  const missing: string[] = [];
  const parts: string[] = [];
  const reserved: string[] = [];
  let needsVerification = false;

  for (const choice of relevant) {
    const inPlan = planAll.has(choice.courseCode) || covered.has(choice.courseCode);
    const label = `${choice.name} (${choice.cfu} CFU)`;

    switch (choice.state) {
      case "closed":
        reserved.push(choice.courseCode);
        break;

      case "not_due_yet":
        if (!inPlan) {
          parts.push(
            `${label} è obbligatorio per il percorso ${context.track}: se non lo scegli entro l'anno ${choice.dueByYear - 1}, all'anno ${choice.dueByYear} dovrai sceglierlo in ${groupLabel(catalog, choice.recoveryGroup) ?? "tabella di recupero"}, dove occuperà parte dei CFU del gruppo a scelta.`
          );
        }
        break;

      case "reinsert_past_frequency":
        if (inPlan) {
          reserved.push(choice.courseCode);
        } else {
          missing.push(choice.courseCode);
          parts.push(
            `${label} era già nel tuo piano di un anno precedente e l'esame non è ancora verbalizzato: va reinserito così com'era, nel blocco in cui l'avevi scelto${choice.pastGroup ? ` (${groupLabel(catalog, choice.pastGroup)})` : ""}. Non è una nuova scelta e non occupa i CFU del gruppo a scelta.`
          );
        }
        break;

      case "choose_in_recovery_table":
        // Nessuna prenotazione: questi CFU devono restare visibili al gruppo a scelta,
        // che è esattamente dove il Regolamento li colloca.
        if (!inPlan) {
          missing.push(choice.courseCode);
          parts.push(
            `${label} non risulta scelto negli anni precedenti: il Regolamento chiede di sceglierlo ora in ${groupLabel(catalog, choice.recoveryGroup) ?? "tabella di recupero"}. È una nuova frequenza e i suoi ${choice.cfu} CFU contano dentro il gruppo a scelta.`
          );
        }
        if (choice.inferredFromMissingHistory) needsVerification = true;
        break;
    }
  }

  if (needsVerification) {
    parts.push(
      "Non ho piani degli anni precedenti in archivio, quindi \"non scelto\" è una deduzione: se in realtà l'avevi già inserito, registra quel piano oppure segna l'esito dell'esame in carriera."
    );
  }

  const satisfied = missing.length === 0 && parts.length === 0;
  return finding({
    ...base,
    satisfied,
    missing,
    reserved,
    severityHint: needsVerification ? "warning" : "blocking",
    provenance: needsVerification ? "operational_to_verify" : rule.provenance,
    detail: parts.join(" "),
  });
}

/**
 * Gruppo a scelta. Il totale esatto è attestato dal Regolamento, ma **quando** va raggiunto no:
 * le tabelle contengono insegnamenti del secondo semestre, che la finestra di modifica semestrale
 * permette di aggiungere. Un ammanco colmabile con quelli è quindi un avviso operativo, non un
 * errore bloccante.
 *
 * Il conteggio segue l'invariante 2: si contano solo le attività il cui **contesto di scelta**
 * appartiene alle tabelle del gruppo. Un'attività coperta in un blocco obbligatorio del secondo
 * anno non entra qui, nemmeno se lo stesso codice compare anche in una tabella del terzo anno.
 */
function evaluateChoiceRule(
  rule: Extract<PlanRule, { kind: "choice_cfu" }>,
  context: RuleEvalContext,
  applicability: Applicability
): RuleFinding {
  const { catalog, track, covered, coverageGroup, externalChoiceCfu, validationMode } = context;
  const counted: string[] = [];
  let cfu = 0;
  for (const code of covered) {
    if (!findCourse(catalog, code)) continue;
    const group = coverageGroup.get(code) ?? null;
    if (group === null || !rule.groups.includes(group)) continue;
    counted.push(code);
    cfu += courseCfu(catalog, code);
  }
  if (rule.countsExternal) cfu += externalChoiceCfu;

  const base = {
    ruleId: rule.id,
    label: rule.label,
    source: rule.source,
    provenance: rule.provenance,
    dueNow: applicability.dueNow,
    dueByYear: applicability.dueByYear,
    reserved: counted,
    missing: [] as string[],
  };
  const shortfall = rule.requiredCfu - cfu;
  const tables = groupLabelList(catalog, rule.groups);

  if (shortfall === 0) return finding({ ...base, satisfied: true, detail: "" });

  // Fuori dall'anno di esigibilità il gruppo non è un ammanco: è il quadro dell'anno che verrà.
  if (!applicability.dueNow) {
    return finding({
      ...base,
      satisfied: false,
      detail: shortfall > 0
        ? `All'anno ${applicability.dueByYear} dovrai comporre ${rule.requiredCfu} CFU scegliendo da: ${tables}. Al momento ne risultano ${cfu}.`
        : `Le tabelle del gruppo da ${rule.requiredCfu} CFU (${tables}) risultano già oltre il totale di ${-shortfall} CFU: quando arriverai all'anno ${applicability.dueByYear} l'eccedenza andrà in soprannumero.`,
    });
  }

  if (shortfall < 0) {
    return finding({
      ...base, satisfied: false,
      detail: `Il gruppo a scelta deve totalizzare esattamente ${rule.requiredCfu} CFU scegliendo da ${tables}: ce ne sono ${-shortfall} in più. I CFU eccedenti vanno messi in soprannumero.`,
    });
  }

  const canFinishLater = rule.completableInSecondSemesterWindow
    && isReachable(shortfall, secondSemesterOptions(catalog, track, rule.groups, covered));

  if (!canFinishLater) {
    return finding({
      ...base, satisfied: false,
      detail: `Mancano ${shortfall} CFU al gruppo da ${rule.requiredCfu} CFU (${tables}) e non sono colmabili con insegnamenti del secondo semestre: vanno inseriti in questa presentazione.`,
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
      : `Mancano ${shortfall} CFU al gruppo da ${rule.requiredCfu} CFU. Non è un errore: puoi completarlo adesso oppure nella finestra di modifica del secondo semestre, aggiungendo insegnamenti del 2° semestre da ${tables}.`,
  });
}
