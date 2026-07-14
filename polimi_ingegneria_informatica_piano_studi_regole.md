# Politecnico di Milano - Ingegneria Informatica 531
# Regole per compilazione/validazione Piano degli Studi - AA 2025/2026

Data di estrazione: 2026-07-09
Ambito: Laurea triennale in Ingegneria Informatica, codice corso 531, classe L-8, lingua italiana.
Fonti principali:
- Manifesto/Regolamento didattico ufficiale AA 2025/2026: `onlineservices.polimi.it/manifesti/...RegolamentoPublic.do?...aa=2025&k_corso_la=531&lang=IT`
- Manifesto navigabile per PSPA AA 2025/2026: `onlineservices.polimi.it/manifesti/manifesti/controller/ManifestoPublic.do?...aa=2025&k_corso_la=531&lang=IT`
- Scheda pubblica corso Polimi: `polimi.it/formazione/corsi-di-laurea/dettaglio-corso/ingegneria-informatica`
- Pagina generale Polimi “Piano degli Studi e OFA” e sottopagine su presentazione/modifiche/PSPA.

> Scopo del documento: specifica implementativa per un validatore/assistente AI che costruisce un Piano degli Studi per Ingegneria Informatica Polimi. Le regole sotto separano vincoli duri, scelte preapprovate, regole di approvazione e note orientative.

---

## 1. Identità del corso

```yaml
course_code: 531
course_name: Ingegneria Informatica
degree_level: Laurea di primo livello
class: L-8 Ingegneria dell'informazione
duration_years: 3
official_language: IT
school: Scuola di Ingegneria Industriale e dell'Informazione
campuses:
  - Milano Leonardo
  - Cremona
academic_year: 2025/2026
required_total_cfu: 180
```

Percorsi/PSPA attivi:

| PSPA | Nome | Sede/modalità | Anni attivi | Note |
|---|---|---:|---:|---|
| `IT1` | Ingegneria Informatica | Milano Leonardo, presenza | 1-2 | Primo biennio comune per Milano in presenza. Al terzo anno si passa a `I3I` o `I3C`. |
| `I3I` | Informatica | Milano Leonardo, presenza | 3 | Terzo anno orientamento informatico. |
| `I3C` | Comunicazioni | Milano Leonardo, presenza | 3 | Terzo anno orientamento telecomunicazioni/comunicazioni. |
| `IOL` | Ingegneria Informatica Online | Milano Leonardo, online | 1-3 | Didattica online, esami in presenza a Milano Leonardo. |
| `I1C` | Ingegneria Informatica | Cremona, presenza | 1-3 | Percorso completo a Cremona. |

Regola strutturale:

```pseudo
if campus == "Milano Leonardo" and mode == "presenza":
  year1.pspa = IT1
  year2.pspa = IT1
  year3.pspa in {I3I, I3C}
elif campus == "Milano Leonardo" and mode == "online":
  year1.pspa = IOL
  year2.pspa = IOL
  year3.pspa = IOL
elif campus == "Cremona":
  year1.pspa = I1C
  year2.pspa = I1C
  year3.pspa = I1C
```

---

## 2. Regole generali di Piano degli Studi Polimi

### 2.1 Validità annuale e presentazione

Vincoli generali per corsi di Laurea:

1. Il Piano degli Studi ha validità annuale.
2. Deve essere presentato tramite Servizi Online nelle finestre previste dal Polimi.
3. Per accedere alla presentazione del piano è richiesto il pagamento della prima rata.
4. Il sistema Polimi propone un piano intorno a 60 CFU annui.
5. In fase di presentazione ordinaria, il piano può contenere da 30 a 80 CFU per anno.
6. Un piano sotto 30 CFU è ammesso solo in casi specifici, ad esempio:
   - studente in difetto di OFA;
   - studente vicino alla conclusione degli studi;
   - immatricolazione a Laurea Magistrale al secondo semestre, dove il minimo indicato è 15 CFU.
7. Per studenti di Laurea triennale è possibile inserire massimo 32 CFU soprannumerari sull'intera durata del corso, compatibilmente con il regolamento didattico.
8. Per neo-immatricolati a corsi di Laurea triennale in Ingegneria, il piano può essere assegnato d'ufficio dalla Scuola.

Implementazione suggerita:

```pseudo
annual_effective_cfu = sum(cfu where position == "effettivo" and year == current_plan_year)
annual_supernumerary_cfu = sum(cfu where position == "soprannumero")

if not exceptional_case:
  require 30 <= annual_effective_cfu + annual_supernumerary_cfu <= 80

require total_supernumerary_cfu_across_degree <= 32
```

### 2.2 Esami non superati e nuove frequenze

Per i corsi di Laurea:

1. Gli esami non ancora superati presenti in piani precedenti devono essere reinseriti prima di inserire nuove frequenze.
2. Anche gli insegnamenti del secondo semestre già frequentati devono essere reinseriti nel nuovo piano, anche se lo studente intende sostenere l'appello di recupero di gennaio/febbraio.
3. Se l'esame viene superato nell'appello di recupero, l'insegnamento viene tolto dalle nuove frequenze e non viene conteggiato ai fini della determinazione delle tasse.
4. In fase di iscrizione all'esame bisogna scegliere l'appello relativo all'anno accademico precedente, non quello del nuovo piano.

Implementazione suggerita:

```pseudo
for course in student_history.unpassed_courses_from_previous_plans:
  require course in new_plan before adding new_frequencies

if course.was_attended_in_previous_second_semester and not course.passed_at_plan_submission_time:
  require course in new_plan

on_recovery_exam_passed(course):
  remove course from new_frequencies
  exclude course.cfu from fee_cfu_count
```

### 2.3 Piano consigliato, autonomo e approvazione

Tipi di piano:

| Tipo | Condizione | Esito |
|---|---|---|
| Piano consigliato/preapprovato | Rispetta esattamente le proposte e i gruppi del Manifesto/Regolamento | Approvazione automatica alla fine del periodo di presentazione. |
| Piano autonomo | Contiene scelte fuori dalle tabelle/gruppi preapprovati o combinazioni non standard | Valutazione della Commissione/CCS. |

Regole specifiche del corso 531:

1. Sono ammesse scelte autonome fino a 15 CFU tra tutti gli insegnamenti attivati nell'Ateneo, purché coerenti con il progetto formativo.
2. Se i 15 CFU a scelta sono selezionati dalle tabelle previste nel Regolamento/Manifesto, il piano è approvato automaticamente.
3. Se anche solo parte dei 15 CFU a scelta è fuori dalle tabelle previste, il piano deve essere valutato dalla commissione.

Implementazione:

```pseudo
if all(choice_course in preapproved_choice_tables_for_pspa):
  approval_status = "auto_approved_after_deadline"
else:
  approval_status = "needs_commission_review"
```

### 2.4 Modifiche facoltative al secondo semestre

Per le Scuole di Ingegneria, nel secondo semestre sono ammesse modifiche facoltative al piano.

Modifiche consentite:

1. Aggiunta o eliminazione di richieste limitatamente a insegnamenti del secondo semestre dell'anno accademico di presentazione.
2. Cambio posizione di attività formative da `soprannumero` a `effettivo` o viceversa, anche se inserite in anni precedenti.

Modifiche non consentite:

1. Non è possibile modificare il PSPA/orientamento/track scelto nella presentazione annuale.
2. Fuori dalle scadenze non è possibile modificare il piano, salvo casi OFA.
3. In modifica semestrale non è possibile autocertificare il superamento di esami non ancora registrati in carriera.

Implementazione:

```pseudo
if modification_window == "second_semester":
  allow change only if course.period == "2S" or change == "effective/supernumerary toggle"
  forbid pspa_change
  forbid self_certification_of_unregistered_exams
```

---

## 3. Vincoli globali per conseguire la Laurea

### 3.1 CFU complessivi

Per conseguire il titolo sono richiesti 180 CFU; il validatore del piano preapprovato richiede quindi esattamente 180 CFU effettivi e tiene gli eventuali soprannumerari separati.

Composizione minima/massima delle attività formative indicata dal regolamento:

| Ambito | Vincolo CFU |
|---|---:|
| Attività di base | almeno 50 CFU |
| Attività caratterizzanti | almeno 60 CFU |
| Attività affini o integrative | almeno 18 CFU |
| Attività a scelta dello studente | 12-18 CFU; nel Manifesto del corso sono normalmente organizzate come gruppo da 15 CFU |
| Prova finale | 5 CFU |
| Totale Laurea | 180 CFU |

### 3.2 Vincoli SSD ministeriali

#### Attività di base

| Ambito disciplinare | SSD ammessi | CFU min-max |
|---|---|---:|
| Matematica, informatica e statistica | INF/01, ING-INF/05, MAT/02, MAT/03, MAT/05, MAT/06, MAT/08 | 38-50 |
| Fisica e chimica | CHIM/07, FIS/01 | 12-33 |
| Totale attività di base |  | 50-83 |

#### Attività caratterizzanti

| Ambito disciplinare | SSD ammessi | CFU min-max |
|---|---|---:|
| Ingegneria elettronica | ING-INF/01 | 10-20 |
| Ingegneria informatica | ING-INF/05 | 20-60 |
| Ingegneria delle telecomunicazioni | ING-INF/02, ING-INF/03 | 10-60 |
| Totale attività caratterizzanti |  | 60-92 |

Implementazione:

```pseudo
require total_effective_cfu == 180
require base_cfu >= 50
require characterizing_cfu >= 60
require affine_integrative_cfu >= 18
require 12 <= free_choice_cfu <= 18
require final_exam_cfu == 5

require 38 <= cfu_by_base_area["math_info_stats"] <= 50
require 12 <= cfu_by_base_area["physics_chemistry"] <= 33
require 50 <= total_base_area_cfu <= 83

require 10 <= cfu_by_characterizing_area["electronics"] <= 20
require 20 <= cfu_by_characterizing_area["computer_engineering"] <= 60
require 10 <= cfu_by_characterizing_area["telecommunications"] <= 60
require 60 <= total_characterizing_area_cfu <= 92
```

### 3.3 Tirocinio

1. Il tirocinio non è obbligatorio.
2. Può essere inserito tra gli insegnamenti a scelta dello studente.
3. Il Manifesto prevede varianti da 5 CFU o 10 CFU, spesso disponibili in entrambi i semestri.
4. Per l'accesso alla LM Computer Science and Engineering, il regolamento segnala che il tirocinio da 10 CFU può generare 5 CFU di obblighi aggiuntivi; se si vuole fare esperienza aziendale e poi proseguire in LM, è consigliato il tirocinio da 5 CFU.

Implementazione suggerita:

```pseudo
if internship_selected:
  require internship.cfu in {5, 10}
  count internship.cfu as free_choice_cfu
  mark not_mandatory = true

# Evitare duplicati salvo casi gestiti manualmente dalla segreteria/commissione.
forbid selecting both 5_cfu_internship and 10_cfu_internship in the same standard plan
forbid selecting same internship code in both semesters
```

### 3.4 Prova finale

1. La prova finale vale complessivamente 5 CFU.
2. È composta da moduli/progetti collegati a insegnamenti progettuali.
3. La prova finale consiste in un elaborato interdisciplinare svolto nell'ambito di uno o più insegnamenti, con il coordinamento di docenti/tutor.
4. Normalmente la prova finale è collegata ad attività di laboratorio con frequenza obbligatoria.

Validazione consigliata:

```pseudo
require sum(cfu where type == "V" and position == "effettivo") == 5
```

Eccezione/nota di cautela: nel percorso `IOL`, dallo scraping del Manifesto compare chiaramente un modulo `Prova Finale (Ingegneria del Software)` da 3 CFU, mentre il regolamento generale richiede 5 CFU finali. Il validatore deve trattare questo punto come dato da verificare su export ufficiale completo o servizi studenti, non inventare moduli mancanti.

### 3.5 Corsi soprannumerari di Laurea Magistrale

Regola del corso:

1. È possibile inserire nel Piano della Laurea insegnamenti della Laurea Magistrale in soprannumero.
2. Limite massimo: 32 CFU in soprannumero.
3. L'ottenimento di CFU soprannumerari di LM non garantisce l'accesso alla LM.

Implementazione:

```pseudo
if course.level == "LM" and course.position == "soprannumero":
  require total_supernumerary_cfu <= 32
  course.counts_toward_bachelor_180 = false
```

---

## 4. Modello dati consigliato

```ts
type Campus = "MI" | "CR";
type Period = "1S" | "2S" | "ANNUALE";
type TeachingType = "M" | "I" | "T" | "V";
type PlanPosition = "effettivo" | "soprannumero";
type ApprovalStatus = "auto_approved_after_deadline" | "needs_commission_review" | "invalid";

type CourseOffering = {
  code: string;
  title: string;
  cfu: number;
  period: Period;
  campus: Campus;
  pspa: "IT1" | "I3I" | "I3C" | "IOL" | "I1C";
  year: 1 | 2 | 3;
  type: TeachingType;
  ssd_new?: string;
  ssd_old?: string;
  limited_seats?: boolean;
  innovative_cfu?: number;
  notes?: string[];
};

type ChoiceGroup = {
  id: string;
  required_cfu: number;
  selection_rule: "exactly_one" | "choose_cfu" | "bundle_exactly_one" | "all_or_none_bundle";
  options: Array<CourseOffering | CourseBundle | string>;
};
```

Legenda `type` Polimi:

| Codice | Significato |
|---|---|
| `M` | Insegnamento monodisciplinare |
| `I` | Insegnamento integrato |
| `T` | Tirocinio |
| `V` | Prova finale / progetto di prova finale |

---

## 5. Algoritmo globale di validazione

```pseudo
function validateStudyPlan(plan, student_history): ValidationResult {
  require plan.course_code == 531
  require plan.academic_year == 2025/2026

  validateCampusAndPspaSequence(plan)
  validateAnnualCfuLimits(plan, student_history)
  validateCarryOverUnpassedExams(plan, student_history)
  validateNoDuplicateEffectiveCourses(plan)
  validateMandatoryCoursesAndBundles(plan)
  validateChoiceGroups(plan)
  validateRecoveryRules(plan, student_history)
  validateFreeChoiceCfu(plan)
  validateFinalExamCfu(plan)
  validateGlobalDegreeCfuAndSsdRanges(plan)
  validateSupernumeraryLimits(plan)

  if plan.usesOnlyPreapprovedTables && allHardConstraintsSatisfied:
    return auto_approved_after_deadline
  else if allHardConstraintsSatisfied:
    return needs_commission_review
  else:
    return invalid
}
```

Regole antduplicazione:

```pseudo
# Un codice insegnamento non può essere contato due volte come effettivo.
for course_code in plan.effective_courses:
  require count(course_code) == 1

# Se lo stesso corso compare in più semestri come alternativa di tirocinio/progetto,
# una sola offerta può essere selezionata nel piano standard.
for equivalent_activity in equivalent_offerings:
  require selected_count(equivalent_activity) <= 1
```

---

# 6. Milano in presenza - PSPA IT1, anni 1-2

## 6.1 IT1 - Anno 1, corsi obbligatori

Totale: 60 CFU.

| Codice | Insegnamento | CFU | Sem. | Sede | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|---|
| `082740` | Analisi Matematica 1 | 10 | 1S | MI | M | MATH-03/A | MAT/05 | Obbligatorio |
| `082746` | Fondamenti di Informatica | 10 | 1S | MI | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `082747` | Geometria e Algebra Lineare | 8 | 1S | MI | M | MATH-02/B | MAT/03 | Obbligatorio |
| `051124` | Fisica | 12 | 2S | MI | I | PHYS-03/A | FIS/01 | Obbligatorio |
| `082748` | Elettrotecnica | 10 | 2S | MI | M | IIET-01/A | ING-IND/31 | Obbligatorio |
| `054303` | Fondamenti di Comunicazioni e Internet | 10 | 2S | MI | M | IINF-03/A | ING-INF/03 | Obbligatorio; 1 CFU didattica innovativa |

Validazione:

```pseudo
require all(IT1_YEAR1_MANDATORY in plan.year1)
require sum_cfu(plan.year1, pspa="IT1") == 60
```

## 6.2 IT1 - Anno 2, struttura generale

Il secondo anno IT1 contiene corsi obbligatori e tre blocchi di scelta. Totale atteso: 61 CFU, perché uno dei blocchi include 1 CFU di prova finale/progetto.

### 6.2.1 IT1 anno 2 - corsi obbligatori fissi

| Codice | Insegnamento | CFU | Sem. | Sede | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|---|
| `052425` | Analisi Matematica 2 | 10 | 1S | MI | M | MATH-03/A | MAT/05 | Obbligatorio |
| `085779` | Architettura dei Calcolatori e Sistemi Operativi | 10 | 1S | MI | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `085905` | Fondamenti di Automatica | 10 | 2S | MI | M | IINF-04/A | ING-INF/04 | Obbligatorio |

### 6.2.2 IT1 anno 2 - blocco `IT1-2Y-B1`, 10 CFU

Selezionare una delle due alternative:

#### Alternativa A: Logica e Algebra + un corso TABA da 5 CFU

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `085903` | Logica e Algebra | 5 | 1S | M | MATH-01/A + MATH-02/A | MAT/01 + MAT/02 | Obbligatorio per chi poi sceglie `I3I`; se non scelto in anno 2 va recuperato in anno 3 `I3I`. |

Più esattamente uno tra:

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `085900` | Chimica Generale | 5 | 1S | M | CHEM-06/A | CHIM/07 | Tabella `TABA` |
| `058081` | Fisica Tecnica | 5 | 1S | M | IIND-07/A | ING-IND/10 | Numero chiuso |
| `058083` | Misure | 5 | 1S | M | IMIS-01/B | ING-INF/07 | Numero chiuso |
| `058084` | Onde Elettromagnetiche e Mezzi Trasmissivi | 5 | 1S | M | IINF-02/A | ING-INF/02 | Numero chiuso |

#### Alternativa B: Elettromagnetismo e Campi

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `093506` | Elettromagnetismo e Campi | 10 | 1S | M | IINF-02/A | ING-INF/02 | Consigliato per chi poi sceglie `I3C`. |

Validazione:

```pseudo
valid_B1 =
  (selected("085903") and exactly_one_selected({"085900","058081","058083","058084"}))
  or selected("093506")

require cfu(B1) == 10
require valid_B1
```

### 6.2.3 IT1 anno 2 - blocco `IT1-2Y-B2`, 10 CFU

Scegliere esattamente uno dei due insegnamenti. La scelta non vincola gli orientamenti successivi.

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `099319` | Probabilità e Statistica per l'Informatica | 10 | 2S | M | MATH-03/B | MAT/06 | Scelta libera |
| `054304` | Informazione e Stima (per Ingegneria Informatica) | 10 | 2S | M | IINF-03/A | ING-INF/03 | Scelta libera |

Validazione:

```pseudo
require exactly_one_selected({"099319", "054304"})
```

### 6.2.4 IT1 anno 2 - blocco `IT1-2Y-B3`, 11 CFU

Scegliere esattamente uno dei due bundle. Ogni bundle include 10 CFU di corso + 1 CFU di prova finale/progetto.

#### Bundle Comunicazioni

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `099322` | Segnali per le Comunicazioni | 10 | 2S | M | IINF-03/A | ING-INF/03 | Obbligatorio per chi poi sceglie `I3C`; se non scelto in anno 2 va recuperato in anno 3 `I3C`. |
| `054440` | Prova Finale (Progetto di Segnali per le Comunicazioni) | 1 | 2S | V | - | - | Modulo prova finale associato. |

#### Bundle Informatica

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `086067` | Algoritmi e Principi dell'Informatica | 10 | 2S | M | IINF-05/A | ING-INF/05 | Obbligatorio per chi poi sceglie `I3I`; se non scelto in anno 2 va recuperato in anno 3 `I3I`. |
| `052509` | Prova Finale (Progetto di Algoritmi e Strutture Dati) | 1 | 2S | V | - | - | Modulo prova finale associato. |

Validazione:

```pseudo
require exactly_one_bundle_selected({
  "COMMUNICATIONS_BUNDLE": {"099322", "054440"},
  "INFORMATICS_BUNDLE": {"086067", "052509"}
})
```

### 6.2.5 Regole di recupero collegate al terzo anno

```pseudo
# Per I3I
if plan.year3.pspa == "I3I":
  require selected_or_recovered("085903")  # Logica e Algebra
  require selected_or_recovered("086067")  # Algoritmi e Principi dell'Informatica

# Per I3C
if plan.year3.pspa == "I3C":
  require selected_or_recovered("099322")  # Segnali per le Comunicazioni
```

Note:

- `Logica e Algebra` e `Algoritmi e Principi dell'Informatica` sono obbligatori per `I3I`.
- `Segnali per le Comunicazioni` è obbligatorio per `I3C`.
- `Elettromagnetismo e Campi` è solo consigliato per `I3C`, non obbligatorio.
- La scelta tra `Probabilità e Statistica per l'Informatica` e `Informazione e Stima` non vincola scelte successive.

---

# 7. Milano in presenza - PSPA I3I, anno 3 Informatica

## 7.1 I3I - corsi obbligatori/bundle strutturati

| Gruppo | Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---|---:|---|---|---|---|---|
| Fisso | `085746` | Fondamenti di Elettronica | 10 | 1S | M | IINF-01/A | ING-INF/01 | Obbligatorio |
| PF-Reti | `085877` | Reti Logiche | 5 | 1S | M | IINF-05/A | ING-INF/05 | Con progetto prova finale |
| PF-Reti | `054441` | Prova Finale (Progetto di Reti Logiche) | 1 | 1S | V | - | - | Modulo prova finale |
| PF-Software | `052510` | Ingegneria del Software | 7 | 1S | M | IINF-05/A | ING-INF/05 | 1,5 CFU didattica innovativa |
| PF-Software | `085923` | Prova Finale (Ingegneria del Software) | 3 | 2S | V | - | - | Modulo prova finale |

Validazione:

```pseudo
require selected("085746")
require selected_all({"085877", "054441"})
require selected_all({"052510", "085923"})
```

## 7.2 I3I - bundle lingua per Sistemi Informativi, Basi di Dati, Economia

Scegliere esattamente un bundle: tutto italiano oppure tutto inglese.

### Bundle italiano, 18 CFU

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `052511` | Sistemi Informativi (per il settore dell'informazione) | 5 | 1S | M | IINF-05/A | ING-INF/05 | 1 CFU didattica innovativa |
| `085887` | Basi di Dati 1 | 5 | 1S | M | IINF-05/A | ING-INF/05 |  |
| `051289` | Economia e Organizzazione Aziendale | 8 | 2S | M | IEGE-01/A | ING-IND/35 |  |

### Bundle inglese, 18 CFU, posti limitati

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `063149` | Information Systems | 5 | 1S | M | IINF-05/A | ING-INF/05 | Numero chiuso; 1 CFU didattica innovativa |
| `063579` | Databases | 5 | 1S | M | IINF-05/A | ING-INF/05 | Numero chiuso |
| `063150` | Economics & Business Administration | 8 | 2S | M | IEGE-01/A | ING-IND/35 | Numero chiuso |

Regole:

1. Gli insegnamenti inglesi sono a numero chiuso.
2. L'accesso avviene inserendoli nel piano fino a saturazione posti.
3. Se si sceglie uno dei tre insegnamenti in inglese, anche gli altri due devono essere scelti in inglese.
4. Non sono ammesse combinazioni miste italiano/inglese nel piano preapprovato.

Validazione:

```pseudo
italian_bundle = {"052511", "085887", "051289"}
english_bundle = {"063149", "063579", "063150"}

require exactly_one_bundle_selected({italian_bundle, english_bundle})

if any_selected(english_bundle):
  require all_selected(english_bundle)
  mark limited_seats_dependency = true
```

## 7.3 I3I - gruppo scelte/recuperi da 15 CFU

Il Manifesto presenta un gruppo da 15 CFU selezionabile dalle seguenti tabelle: `TABREC`, `TABAUT`, `TABINF`, `TABING`, `TABTLC`.

Regola base:

```pseudo
require sum_cfu(selected_courses in I3I_CHOICE_TABLES) == 15
```

Regola di recupero prioritaria:

```pseudo
if not previously_selected_or_passed("085903"):
  require selected("085903") in I3I choice/recovery group

if not previously_selected_or_passed("086067"):
  require selected("086067") in I3I choice/recovery group
```

### `TABREC` - recuperi obbligatori per I3I se mancanti

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `085903` | Logica e Algebra | 5 | 1S | M | MATH-01/A + MATH-02/A | MAT/01 + MAT/02 | Obbligatorio se non già fatto in IT1 anno 2 |
| `086067` | Algoritmi e Principi dell'Informatica | 10 | 2S | M | IINF-05/A | ING-INF/05 | Obbligatorio se non già fatto in IT1 anno 2 |

### `TABAUT` - automatica

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio |
|---|---|---:|---|---|---|---|
| `088877` | Teoria dei Sistemi (Dinamica Non Lineare) | 5 | 1S | M | IINF-04/A | ING-INF/04 |
| `085901` | Automazione Industriale | 5 | 2S | M | IINF-04/A | ING-INF/04 |

### `TABINF` - informatica

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `097654` | Tirocinio (Ing. Informatica) | 5 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `086369` | Tirocinio (Ing. Informatica) | 10 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `059429` | Fondamenti di Human-Computer Interaction | 5 | 1S | M | IINF-05/A | ING-INF/05 |  |
| `056889` | Foundations of Artificial Intelligence | 5 | 1S | M | IINF-05/A | ING-INF/05 |  |
| `097654` | Tirocinio (Ing. Informatica) | 5 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `086369` | Tirocinio (Ing. Informatica) | 10 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `052512` | Bioinformatics Algorithms | 5 | 2S | M | IINF-05/A | ING-INF/05 |  |
| `054221` | Fondamenti di Calcolo Numerico | 5 | 2S | M | MATH-05/A | MAT/08 | 1 CFU didattica innovativa |
| `089020` | Progetto di Ingegneria Informatica (5 CFU) | 5 | 2S | M | IINF-05/A | ING-INF/05 | Progetto |
| `089013` | Robotics | 5 | 2S | M | IINF-05/A | ING-INF/05 |  |
| `085879` | Tecnologie Informatiche per il Web | 5 | 2S | M | IINF-05/A | ING-INF/05 |  |

### `TABING` - affini ingegneristiche

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio |
|---|---|---:|---|---|---|---|
| `088805` | Fisica Tecnica | 5 | 2S | M | IIND-07/A | ING-IND/10 |
| `088804` | Meccanica (per Ing. Informatica) | 5 | 2S | M | IIND-03/A | ING-IND/13 |

### `TABTLC` - telecomunicazioni

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio |
|---|---|---:|---|---|---|---|
| `054305` | Dispositivi per la Trasmissione dell'Informazione | 5 | 2S | M | IINF-02/A | ING-INF/02 |
| `059431` | Introduzione alle Tecnologie di Interconnessione | 5 | 2S | M | IINF-03/A | ING-INF/03 |
| `051231` | Ottica e Immagini | 5 | 2S | M | IINF-02/A | ING-INF/02 |
| `059430` | Problemi Inversi Applicati al Telerilevamento | 5 | 2S | M | IINF-03/A | ING-INF/03 |
| `099322` | Segnali per le Comunicazioni | 10 | 2S | M | IINF-03/A | ING-INF/03 |
| `051230` | Sicurezza delle Reti | 5 | 2S | M | IINF-03/A | ING-INF/03 |
| `051234` | Software Defined Networking | 5 | 2S | M | IINF-03/A | ING-INF/03 |

---

# 8. Milano in presenza - PSPA I3C, anno 3 Comunicazioni

## 8.1 I3C - corsi obbligatori/bundle strutturati

| Gruppo | Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---|---:|---|---|---|---|---|
| Fisso | `085746` | Fondamenti di Elettronica | 10 | 1S | M | IINF-01/A | ING-INF/01 | Obbligatorio |
| Fisso | `093283` | Fondamenti di Elaborazione Numerica dei Segnali | 10 | 1S | M | IINF-03/A | ING-INF/03 | Obbligatorio |
| PF-Sistemi | `097459` | Sistemi di Comunicazione | 7 | 1S | M | IINF-03/A | ING-INF/03 | Con prova finale |
| PF-Sistemi | `097460` | Prova Finale (Sistemi di Comunicazione) | 3 | 1S | V | - | - | Modulo prova finale |
| PF-SDN | `051234` | Software Defined Networking | 5 | 2S | M | IINF-03/A | ING-INF/03 | Con prova finale |
| PF-SDN | `054442` | Prova Finale (Software Defined Networking) | 1 | 2S | V | - | - | Modulo prova finale |
| Fisso | `051289` | Economia e Organizzazione Aziendale | 8 | 2S | M | IEGE-01/A | ING-IND/35 | Obbligatorio |

Validazione:

```pseudo
require selected("085746")
require selected("093283")
require selected_all({"097459", "097460"})
require selected_all({"051234", "054442"})
require selected("051289")
```

## 8.2 I3C - gruppo scelte/recuperi da 15 CFU

Il Manifesto presenta un gruppo da 15 CFU selezionabile dalle tabelle `TABCOM` e `TABGEN`.

Regola base:

```pseudo
require sum_cfu(selected_courses in I3C_CHOICE_TABLES) == 15
```

Regola di recupero prioritaria:

```pseudo
if not previously_selected_or_passed("099322"):
  require selected("099322") in I3C choice/recovery group
```

### `TABCOM` - comunicazioni

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `054305` | Dispositivi per la Trasmissione dell'Informazione | 5 | 2S | M | IINF-02/A | ING-INF/02 |  |
| `059431` | Introduzione alle Tecnologie di Interconnessione | 5 | 2S | M | IINF-03/A | ING-INF/03 |  |
| `051231` | Ottica e Immagini | 5 | 2S | M | IINF-02/A | ING-INF/02 |  |
| `059430` | Problemi Inversi Applicati al Telerilevamento | 5 | 2S | M | IINF-03/A | ING-INF/03 |  |
| `099322` | Segnali per le Comunicazioni | 10 | 2S | M | IINF-03/A | ING-INF/03 | Obbligatorio se non già fatto in IT1 anno 2 |

### `TABGEN` - generali/affini

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `086369` | Tirocinio (Ing. Informatica) | 10 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `097654` | Tirocinio (Ing. Informatica) | 5 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `085900` | Chimica Generale | 5 | 1S | M | CHEM-06/A | CHIM/07 |  |
| `089180` | Numerical Analysis | 5 | 1S | M | MATH-05/A | MAT/08 |  |
| `097654` | Tirocinio (Ing. Informatica) | 5 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `086369` | Tirocinio (Ing. Informatica) | 10 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `083049` | Calcolo Numerico | 5 | 2S | M | MATH-05/A | MAT/08 |  |
| `088805` | Fisica Tecnica | 5 | 2S | M | IIND-07/A | ING-IND/10 |  |
| `088804` | Meccanica (per Ing. Informatica) | 5 | 2S | M | IIND-03/A | ING-IND/13 |  |
| `051230` | Sicurezza delle Reti | 5 | 2S | M | IINF-03/A | ING-INF/03 |  |

---

# 9. Milano online - PSPA IOL, anni 1-3

Regole specifiche:

1. Il percorso `IOL` è erogato online.
2. Gli esami sono in presenza presso Milano Leonardo.
3. Il percorso online è dichiarato equivalente al percorso in presenza per il titolo, ma il Manifesto lo struttura come PSPA separato.
4. Il percorso `IOL` indirizza verso l'area Informatica/Computer Science; non è il percorso orientato Comunicazioni.

## 9.1 IOL - Anno 1

Totale: 60 CFU.

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `082740` | Analisi Matematica 1 | 10 | ANNUALE | M | MATH-03/A | MAT/05 | Obbligatorio |
| `082741` | Economia e Organizzazione Aziendale | 10 | 1S | M | IEGE-01/A | ING-IND/35 | Obbligatorio |
| `082746` | Fondamenti di Informatica | 10 | 1S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `082745` | Fisica | 12 | ANNUALE | I | PHYS-03/A | FIS/01 | Obbligatorio |
| `082742` | Elettrotecnica | 10 | 2S | M | IIET-01/A | ING-IND/31 | Obbligatorio |
| `082747` | Geometria e Algebra Lineare | 8 | 2S | M | MATH-02/B | MAT/03 | Obbligatorio |

## 9.2 IOL - Anno 2

Totale: 60 CFU.

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `085778` | Analisi Matematica 2 | 10 | 1S | M | MATH-03/A | MAT/05 | Obbligatorio |
| `097798` | Calcolo delle Probabilità e Statistica | 10 | 1S | M | MATH-03/B | MAT/06 | Obbligatorio |
| `085779` | Architettura dei Calcolatori e Sistemi Operativi | 10 | 1S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `085905` | Fondamenti di Automatica | 10 | 2S | M | IINF-04/A | ING-INF/04 | Obbligatorio |
| `086067` | Algoritmi e Principi dell'Informatica | 10 | 2S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `085746` | Fondamenti di Elettronica | 10 | 2S | M | IINF-01/A | ING-INF/01 | Obbligatorio |

## 9.3 IOL - Anno 3, corsi obbligatori

| Gruppo | Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---|---:|---|---|---|---|---|
| Fisso | `054303` | Fondamenti di Comunicazioni e Internet | 10 | 1S | M | IINF-03/A | ING-INF/03 | Obbligatorio |
| Fisso | `085874` | Impianti e Servizi Informatici | 10 | 1S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| Fisso | `085876` | Basi di Dati | 5 | 1S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| Fisso | `085877` | Reti Logiche | 5 | 1S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| Fisso | `085879` | Tecnologie Informatiche per il Web | 5 | 2S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| Fisso | `052511` | Sistemi Informativi (per il settore dell'informazione) | 5 | 2S | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| PF-Software | `085885` | Ingegneria del Software | 7 | 2S | M | IINF-05/A | ING-INF/05 | Con prova finale |
| PF-Software | `085923` | Prova Finale (Ingegneria del Software) | 3 | 2S | V | - | - | Modulo prova finale visibile nel Manifesto |

Validazione:

```pseudo
require all(IOL_YEAR3_FIXED)
require selected_all({"085885", "085923"})
```

## 9.4 IOL - gruppo a scelta da 10 CFU

Scegliere 10 CFU dal seguente gruppo.

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `085844` | Fondamenti Chimici per l'Informatica | 5 | 1S | M | CHEM-06/A | CHIM/07 |  |
| `085846` | Interazione Uomo-Macchina | 5 | 1S | M | IINF-05/A | ING-INF/05 |  |
| `097747` | Tirocinio (IOL) | 10 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `085881` | Intelligenza Artificiale | 5 | 2S | M | IINF-05/A | ING-INF/05 |  |
| `085842` | Fondamenti di Ricerca Operativa D | 5 | 2S | M | MATH-06/A | MAT/09 |  |
| `097747` | Tirocinio (IOL) | 10 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `097654` | Tirocinio (Ing. Informatica) | 5 | 1S o 2S | T | - | - | Tirocinio da 5 CFU; alternativa semestrale |

Validazione:

```pseudo
require sum_cfu(selected_courses in IOL_CHOICE_GROUP) == 10
forbid duplicate_course_code_selection({"097747", "097654"})
```

Nota importante su `IOL`: il percorso online mostra 10 CFU a scelta, mentre il regolamento generale del corso indica attività a scelta dello studente 12-18 CFU e solitamente 15 CFU nei PSPA in presenza. Il validatore deve seguire il Manifesto specifico `IOL` per il piano preapprovato, ma mantenere un flag di verifica per il conteggio delle attività libere e della prova finale.

---

# 10. Cremona - PSPA I1C, anni 1-3

## 10.1 I1C - Anno 1

| Codice | Insegnamento | CFU | Sem. | Sede | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|---|
| `082740` | Analisi Matematica 1 | 10 | 1S | CR | M | MATH-03/A | MAT/05 | Obbligatorio |
| `051289` | Economia e Organizzazione Aziendale | 8 | 1S | CR | M | IEGE-01/A | ING-IND/35 | Obbligatorio |
| `082746` | Fondamenti di Informatica | 10 | 1S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| `051124` | Fisica | 12 | 2S | CR | I | PHYS-03/A | FIS/01 | Obbligatorio |
| `082742` | Elettrotecnica | 10 | 2S | CR | M | IIET-01/A | ING-IND/31 | Obbligatorio |
| `082747` | Geometria e Algebra Lineare | 8 | 2S | CR | M | MATH-02/B | MAT/03 | Obbligatorio |

Totale visibile anno 1: 58 CFU. Il totale triennale è compensato dagli anni successivi e dai gruppi progettuali/scelte.

## 10.2 I1C - Anno 2

| Gruppo | Codice | Insegnamento | CFU | Sem. | Sede | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---|---:|---|---|---|---|---|---|
| Fisso | `052425` | Analisi Matematica 2 | 10 | 1S | CR | M | MATH-03/A | MAT/05 | Obbligatorio |
| Fisso | `085905` | Fondamenti di Automatica | 10 | 1S | CR | M | IINF-04/A | ING-INF/04 | Obbligatorio |
| Fisso | `085903` | Logica e Algebra | 5 | 1S | CR | M | MATH-01/A + MATH-02/A | MAT/01 + MAT/02 | Obbligatorio |
| Fisso | `086051` | Automazione dei Processi Produttivi | 5 | 1S | CR | M | IINF-04/A | ING-INF/04 | Obbligatorio |
| Fisso | `099319` | Probabilità e Statistica per l'Informatica | 10 | 2S | CR | M | MATH-03/B | MAT/06 | Obbligatorio |
| PF-Algoritmi | `088926` | Algoritmi e Principi dell'Informatica | 10 | 2S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| PF-Algoritmi | `052509` | Prova Finale (Progetto di Algoritmi e Strutture Dati) | 1 | 2S | CR | V | - | - | Modulo prova finale |
| Fisso | `085779` | Architettura dei Calcolatori e Sistemi Operativi | 10 | 2S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |

Validazione:

```pseudo
require all(I1C_YEAR2_FIXED)
require selected_all({"088926", "052509"})
```

## 10.3 I1C - Anno 3, corsi obbligatori

| Gruppo | Codice | Insegnamento | CFU | Sem. | Sede | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---|---:|---|---|---|---|---|---|
| Fisso | `085746` | Fondamenti di Elettronica | 10 | 1S | CR | M | IINF-01/A | ING-INF/01 | Obbligatorio |
| Fisso | `085887` | Basi di Dati 1 | 5 | 1S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| PF-Reti | `085877` | Reti Logiche | 5 | 1S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| PF-Reti | `054441` | Prova Finale (Progetto di Reti Logiche) | 1 | 1S | CR | V | - | - | Modulo prova finale |
| Fisso | `085914` | Sistemi Informativi (per il settore dell'informazione) | 5 | 1S | CR | M | IINF-05/A | ING-INF/05 | Obbligatorio |
| PF-Software | `052510` | Ingegneria del Software | 7 | 1S | CR | M | IINF-05/A | ING-INF/05 | Con prova finale |
| PF-Software | `085923` | Prova Finale (Ingegneria del Software) | 3 | 2S | CR | V | - | - | Modulo prova finale |
| Fisso | `054908` | Fondamenti di Comunicazioni e Internet | 10 | 2S | CR | I | IINF-03/A | ING-INF/03 | Obbligatorio |

Validazione:

```pseudo
require all(I1C_YEAR3_FIXED)
require selected_all({"085877", "054441"})
require selected_all({"052510", "085923"})
```

## 10.4 I1C - gruppo a scelta da 15 CFU

Scegliere 15 CFU dal gruppo seguente.

| Codice | Insegnamento | CFU | Sem. | Tipo | SSD nuovo | SSD vecchio | Note |
|---|---|---:|---|---|---|---|---|
| `086369` | Tirocinio (Ing. Informatica) | 10 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `058977` | Tirocinio (Ing. Informatica) | 5 | 1S | T | - | - | Tirocinio; alternativa semestrale |
| `088850` | Fisica Tecnica | 5 | 1S | M | IIND-07/A | ING-IND/10 |  |
| `088851` | Progetto Software | 5 | 1S | M | IINF-05/A | ING-INF/05 | Alternativa semestrale |
| `097654` | Tirocinio (Ing. Informatica) | 5 | 2S | T | - | - | Tirocinio; alternativa semestrale |
| `086369` | Tirocinio (Ing. Informatica) | 10 | 2S | T | - | - | Stesso codice del tirocinio 1S; selezionare al massimo una istanza |
| `086039` | Impianti Informatici (per il settore dell'informazione) | 5 | 2S | M | IINF-05/A | ING-INF/05 |  |
| `055924` | Tecnologia Meccanica e Qualità | 10 | 2S | M | IIND-03/B | ING-IND/16 |  |
| `057430` | Ricerca Operativa | 10 | 2S | M | MATH-06/A | MAT/09 |  |
| `088851` | Progetto Software | 5 | 2S | M | IINF-05/A | ING-INF/05 | Stesso codice del corso 1S; selezionare al massimo una istanza |
| `063115` | Foundations of Operations Research (for Automation) | 5 | 2S | M | MATH-06/A | MAT/09 |  |

Validazione:

```pseudo
require sum_cfu(selected_courses in I1C_CHOICE_GROUP) == 15
forbid duplicate_course_code_selection({"086369", "088851"})
```

---

# 11. Regole di accesso/orientamento verso Laurea Magistrale

Queste regole non sono vincoli duri per conseguire la Laurea, ma sono importanti per suggerire scelte nel piano.

## 11.1 Effetto dei PSPA

| Percorso | Accessi LM indicati senza obblighi formativi, salvo note | Note |
|---|---|---|
| `I3I` Milano Informatica | LM Computer Science and Engineering; Geoinformatics Engineering; High Performance Computing Engineering | L'accesso effettivo resta soggetto a selezione e valutazione carriera. |
| `I3C` Milano Comunicazioni | LM Telecommunications Engineering | L'accesso effettivo resta soggetto a selezione e valutazione carriera. |
| `IOL` Online | Area Informatica / Computer Science and Engineering e Geoinformatics | Esami in presenza; non orientato Telecomunicazioni. |
| `I1C` Cremona | LM Computer Science and Engineering e Geoinformatics, salvo note su tirocinio | L'accesso effettivo resta soggetto a selezione e valutazione carriera. |

## 11.2 Obblighi/consigli per LM Computer Science and Engineering

1. Se lo studente non ha acquisito `Meccanica` nel percorso di Laurea, dovrà inserirla in LM Computer Science and Engineering.
2. Se lo studente non ha acquisito almeno uno tra:
   - `Chimica Generale`;
   - `Misure`;
   - `Fisica Tecnica`;
   - `Onde Elettromagnetiche e Mezzi Trasmissivi`;
   - `Elettromagnetismo e Campi`;
   allora dovrà inserire `Fisica Tecnica` in LM Computer Science and Engineering.
3. Il tirocinio da 10 CFU può generare 5 CFU di obblighi aggiuntivi per LM Computer Science and Engineering.

Implementazione come advisory:

```pseudo
if target_lm == "Computer Science and Engineering":
  if not passed_any({"088804", "Meccanica equivalent"}):
    warn("Meccanica potrebbe diventare obbligo in LM CSE")

  if not passed_any({"085900", "058083", "058081", "058084", "093506", "088805", "088850"}):
    warn("Fisica Tecnica potrebbe diventare obbligo in LM CSE")

  if selected_internship_cfu == 10:
    warn("Tirocinio da 10 CFU può generare 5 CFU di obblighi aggiuntivi in LM CSE")
```

## 11.3 Consigli per LM High Performance Computing Engineering

Per ridurre obblighi/integrazioni verso LM High Performance Computing Engineering, il regolamento suggerisce di acquisire in Laurea:

- `Calcolo Numerico` / `Fondamenti di Calcolo Numerico`, 5 CFU;
- `Fondamenti di Ricerca Operativa`, 5 CFU.

Implementazione:

```pseudo
if target_lm == "High Performance Computing Engineering":
  if not passed_any({"083049", "054221", "089180"}):
    warn("Consigliato Calcolo Numerico/Fondamenti di Calcolo Numerico")
  if not passed_any({"085842", "057430", "063115"}):
    warn("Consigliato Fondamenti/Ricerca Operativa")
```

## 11.4 Nessuna garanzia automatica di accesso LM

Il fatto che il piano sia privo di obblighi formativi non garantisce l'accesso alla Laurea Magistrale. L'accesso è soggetto a selezione basata sulla carriera precedente e alla valutazione della commissione.

---

# 12. Regole su doppia iscrizione e convalide

1. È ammessa l'iscrizione contemporanea a due corsi di studio secondo la Legge 33/2022, se le classi di laurea sono diverse e almeno due terzi delle attività formative sono differenti.
2. Per studenti trasferiti da altri corsi di Laurea, possono essere convalidati al massimo 60 CFU.
3. Non sono convalidabili insegnamenti relativi a corsi di studio di livello o tipologia diversa.

Implementazione:

```pseudo
if transfer_student:
  require validated_cfu <= 60
  forbid validating_courses_from_different_level_or_type

if simultaneous_enrollment:
  require degree_classes_are_different
  require differing_activities_ratio >= 2/3
```

---

# 13. Ambiguità e punti da verificare prima di produzione

Questi punti non vanno nascosti nell'implementazione: devono diventare warning o TODO interni.

## 13.1 Interpretazione dei gruppi IT1 anno 2

Il Manifesto HTML visualizza colonne “CFU Gruppo” e righe aggregate. La struttura indicata in questo documento è una ricostruzione implementativa coerente con:

- totale CFU osservato;
- note ufficiali su insegnamenti obbligatori per `I3I` e `I3C`;
- bundle di prova finale da 1 CFU associati ad `Algoritmi` o `Segnali`.

Prima della messa in produzione conviene confrontare con un export ufficiale machine-readable, se disponibile nei Servizi Online.

## 13.2 Prova finale nel percorso IOL

Nel Manifesto `IOL` visibile via scraping compare chiaramente `Prova Finale (Ingegneria del Software)` da 3 CFU. Il regolamento generale richiede 5 CFU di prova finale. Possibili spiegazioni:

1. nel rendering HTML mancano altri moduli `V`;
2. parte dei CFU finali è integrata in un altro insegnamento non marcato come `V` nel rendering;
3. c'è una differenza specifica del PSPA online da verificare.

Implementazione sicura:

```pseudo
if pspa == "IOL":
  warn("Verificare copertura 5 CFU prova finale: Manifesto visibile mostra 3 CFU V")
  do not fabricate missing final_exam_modules
```

## 13.3 Capacità corsi inglesi I3I

Il bundle inglese `063149`, `063579`, `063150` è a numero chiuso. Un validatore offline può solo dire che la combinazione è formalmente corretta; non può garantire disponibilità posti senza dato live.

## 13.4 Insegnamenti con stesso codice in più semestri

Tirocini e alcuni progetti compaiono in entrambi i semestri con lo stesso codice. Il piano standard deve consentire una sola istanza effettiva dello stesso codice, salvo decisione esplicita della commissione.

---

# 14. Tabelle sintetiche per implementazione rapida

## 14.1 Mapping PSPA -> choice groups

```yaml
IT1:
  year1:
    mandatory_cfu: 60
  year2:
    fixed_cfu: 30
    groups:
      - id: IT1-2Y-B1
        required_cfu: 10
      - id: IT1-2Y-B2
        required_cfu: 10
      - id: IT1-2Y-B3
        required_cfu: 11

I3I:
  year3:
    required_fixed_and_bundles_cfu: 44 # 10 + 6 + 10 + 18; totale anno indicativo 59 con scelta da 15
    choice_group_cfu: 15
    recovery_rules:
      - require 085903 if missing
      - require 086067 if missing

I3C:
  year3:
    required_fixed_and_bundles_cfu: 44 # 10 + 10 + 10 + 6 + 8; totale anno indicativo 59 con scelta da 15
    choice_group_cfu: 15
    recovery_rules:
      - require 099322 if missing

IOL:
  year1_cfu: 60
  year2_cfu: 60
  year3_choice_group_cfu: 10
  special_warning:
    - verify final_exam_cfu_total

I1C:
  year1_visible_cfu: 58
  year2_contains_final_exam_cfu: 1
  year3_contains_final_exam_cfu: 4
  year3_choice_group_cfu: 15
```

## 14.2 Hard vs advisory rules

| Regola | Tipo |
|---|---|
| Totale 180 CFU effettivi per laurearsi | Hard |
| Vincoli SSD/ambiti ministeriali | Hard |
| Obbligatorietà dei corsi fissi di PSPA | Hard |
| CFU richiesti nei gruppi di scelta | Hard |
| Bundle inglese I3I tutto-o-niente | Hard per combinazione; disponibilità posti è live |
| Recupero `085903` e `086067` per `I3I` se mancanti | Hard |
| Recupero `099322` per `I3C` se mancante | Hard |
| Tirocinio non obbligatorio | Hard |
| Corsi fuori tabelle entro 15 CFU coerenti | Ammissibile ma richiede valutazione commissione |
| Scelta di `Elettromagnetismo e Campi` per `I3C` | Advisory |
| Scelte per ridurre obblighi LM CSE/HPC | Advisory |
| Accesso automatico alla LM | Falso: non garantito |

---

# 15. Checklist finale per un piano valido

```pseudo
checklist:
  - course_code == 531
  - academic_year == 2025/2026
  - pspa_sequence_allowed
  - annual cfu within allowed limits or exception present
  - previous unpassed courses reinserted
  - no duplicated effective course codes
  - all mandatory courses for selected PSPA present
  - all required bundles selected completely
  - all choice groups reach exact required CFU
  - recovery rules satisfied based on student history
  - final_exam_cfu == 5, except IOL warning pending verification
  - free_choice_cfu within 12..18 and normally 15 for PSPA tables
  - total effective cfu at graduation >= 180
  - supernumerary cfu <= 32 and not counted toward 180
  - if all choices from official tables: auto approval after deadline
  - if external/autonomous choices: commission review required
```
