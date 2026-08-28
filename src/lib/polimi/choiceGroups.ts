/**
 * Progresso dei gruppi a scelta ("GRUPPO A SCELTA" nello strumento ufficiale).
 *
 * Non ricalcola nessuna regola: legge ciò che `rules.ts` ha già valutato (`RuleFinding.reserved`
 * = codici effettivamente contati nel gruppo) e lo trasforma in una struttura pronta per la UI
 * (CFU richiesti/selezionati, voci del piano corrispondenti). Modulo puro, come il resto di
 * `lib/polimi`.
 */

import { courseCfu, groupLabelList } from "./catalog";
import type { Catalog } from "./catalog/types";
import type { PlanEntry, PlanScenario } from "./planModel";
import type { PlanValidationResult } from "./validation";

export type ChoiceGroupProgress = {
  ruleId: string;
  label: string;
  /** Chiavi grezze dei gruppi/tabelle che compongono la regola: servono a filtrare il catalogo. */
  groups: string[];
  tablesLabel: string;
  requiredCfu: number;
  selectedCfu: number;
  satisfied: boolean;
  dueNow: boolean;
  entries: PlanEntry[];
};

export function getChoiceGroupsProgress(
  catalog: Catalog,
  scenario: PlanScenario,
  validation: PlanValidationResult
): ChoiceGroupProgress[] {
  const findingById = new Map(validation.ruleFindings.map((finding) => [finding.ruleId, finding]));
  const progress: ChoiceGroupProgress[] = [];

  for (const rule of catalog.rules) {
    if (rule.kind !== "choice_cfu") continue;
    const finding = findingById.get(rule.id);
    if (!finding) continue;

    const reservedSet = new Set(finding.reserved);
    const entries = scenario.entries.filter((entry) => reservedSet.has(entry.courseCode));
    const selectedCfu = finding.reserved.reduce((total, code) => total + courseCfu(catalog, code), 0);

    progress.push({
      ruleId: rule.id,
      label: rule.label,
      groups: rule.groups,
      tablesLabel: groupLabelList(catalog, rule.groups),
      requiredCfu: rule.requiredCfu,
      selectedCfu,
      satisfied: finding.satisfied,
      dueNow: finding.dueNow,
      entries,
    });
  }

  return progress;
}
