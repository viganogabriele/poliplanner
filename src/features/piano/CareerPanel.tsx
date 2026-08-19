"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ClipboardPaste, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClass, selectClass } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import { deleteCareerExamAction, importCareerExamsAction, upsertCareerExamAction } from "@/app/actions";
import { getCatalog } from "@/lib/polimi/catalog";
import { careerRows } from "@/lib/polimi/career";
import { EXAM_STATUS_LABELS, GRADE_MAX, GRADE_MIN, type ExamStatus, type Track } from "@/lib/polimi/constraints";
import type { CareerExamsMap } from "@/lib/polimi/career";
import { cn } from "@/lib/ui";
import { formatItalianDate } from "@/lib/dates";

const STATUS_VARIANT: Record<ExamStatus, "neutral" | "success" | "warning" | "danger"> = {
  planned: "neutral",
  not_passed: "danger",
  passed_unregistered: "warning",
  passed_registered: "success",
  no_class: "warning",
  not_required: "neutral",
};

const GRADES = [...Array.from({ length: GRADE_MAX - GRADE_MIN + 1 }, (_, i) => String(GRADE_MIN + i)), "30L"];

type Props = {
  exams: CareerExamsMap;
  academicYear: string;
  track: Track;
  onChanged: (exams: CareerExamsMap) => void;
};

export default function CareerPanel({ exams, academicYear, track, onChanged }: Props) {
  const catalog = useMemo(() => getCatalog(academicYear), [academicYear]);
  const rows = useMemo(() => careerRows(catalog, exams, track), [catalog, exams, track]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [draft, setDraft] = useState({ code: "", status: "passed_registered" as ExamStatus, grade: "", registeredAt: "" });

  const catalogOptions = useMemo(
    () => catalog.courses.filter((course) => !exams[course.code]).sort((a, b) => a.name.localeCompare(b.name, "it")),
    [catalog, exams]
  );

  const registeredCfu = rows.filter((row) => row.status === "passed_registered").reduce((total, row) => total + row.cfu, 0);
  const unregisteredCount = rows.filter((row) => row.status === "passed_unregistered").length;

  const run = (label: string, action: () => Promise<{ ok: true; data: { exams: CareerExamsMap } } | { ok: false; error: string }>) => {
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? { ok: true, text: label } : { ok: false, text: result.error ?? "Operazione non riuscita." });
      if (result.ok) onChanged(result.data.exams);
    });
  };

  const addExam = () => {
    if (!draft.code) return setMessage({ ok: false, text: "Scegli un insegnamento." });
    run("Esame aggiunto alla carriera.", () => upsertCareerExamAction({
      code: draft.code,
      status: draft.status,
      grade: draft.grade || null,
      registeredAt: draft.status === "passed_registered" ? (draft.registeredAt || null) : null,
      passedAt: draft.status.startsWith("passed_") ? (draft.registeredAt || null) : null,
    }).then((result) => {
      if (result.ok) setDraft({ code: "", status: "passed_registered", grade: "", registeredAt: "" });
      return result;
    }));
  };

  const runImport = () => {
    const parsed = parseImport(importText);
    if ("error" in parsed) return setMessage({ ok: false, text: parsed.error });
    run(`Importati ${parsed.rows.length} esami.`, () => importCareerExamsAction(parsed.rows).then((result) => {
      if (result.ok) { setImportText(""); setShowImport(false); }
      return result;
    }));
  };

  return (
    <div className="space-y-5">
      <Card inset>
        <CardHeader>
          <div>
            <CardTitle>La mia carriera</CardTitle>
            <CardDescription>
              Quello che risulta davvero in libretto. Solo gli esami <strong>verbalizzati</strong> valgono come superati:
              un esame passato ma non ancora registrato resta un&apos;attività aperta.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{registeredCfu} CFU verbalizzati</Badge>
            {unregisteredCount > 0 && <Badge variant="warning">{unregisteredCount} da verbalizzare</Badge>}
          </div>
        </CardHeader>

        <div className="grid gap-2 rounded-control border border-dashed border-border bg-surface-muted/40 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto]">
          <select
            aria-label="Insegnamento da aggiungere alla carriera"
            value={draft.code}
            onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
            className={selectClass()}
          >
            <option value="">Scegli un insegnamento…</option>
            {catalogOptions.map((course) => (
              <option key={course.code} value={course.code}>{course.name} · {course.cfu} CFU · {course.code}</option>
            ))}
          </select>
          <select
            aria-label="Stato dell'esame"
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as ExamStatus }))}
            className={selectClass()}
          >
            {(Object.keys(EXAM_STATUS_LABELS) as ExamStatus[]).map((status) => (
              <option key={status} value={status}>{EXAM_STATUS_LABELS[status]}</option>
            ))}
          </select>
          <select
            aria-label="Voto"
            value={draft.grade}
            onChange={(event) => setDraft((prev) => ({ ...prev, grade: event.target.value }))}
            disabled={!draft.status.startsWith("passed_")}
            className={selectClass()}
          >
            <option value="">Voto</option>
            {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
          <input
            type="date"
            aria-label="Data di verbalizzazione"
            value={draft.registeredAt}
            onChange={(event) => setDraft((prev) => ({ ...prev, registeredAt: event.target.value }))}
            disabled={!draft.status.startsWith("passed_")}
            className={inputClass()}
          />
          <Button variant="primary" onClick={addExam} disabled={isPending}>
            <Plus className="size-4" />
            Aggiungi
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowImport((value) => !value)}>
            <ClipboardPaste className="size-4" />
            {showImport ? "Chiudi import" : "Import manuale"}
          </Button>
          <InfoButton title="Import manuale">
            <p>Incolla una riga per esame: <code>codice; voto; data verbalizzazione</code>.</p>
            <p>Esempio: <code>082740; 25; 2025-02-10</code></p>
            <p>Se ometti la data l&apos;esame viene registrato con la data odierna. Senza voto viene salvato come verbalizzato senza voto.</p>
            <p>Non esiste alcuna integrazione con i Servizi Online: i dati li inserisci tu.</p>
          </InfoButton>
          {message && <span className={cn("text-xs", message.ok ? "text-success" : "text-danger")}>{message.text}</span>}
        </div>

        {showImport && (
          <div className="mt-3 space-y-2">
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={6}
              placeholder={"082740; 25; 2025-02-10\n082746; 27; 2025-02-14"}
              className={inputClass("py-2 font-mono text-xs")}
            />
            <Button variant="secondary" size="sm" onClick={runImport} disabled={isPending}>
              <CheckCircle2 className="size-4" />
              Importa nella carriera
            </Button>
          </div>
        )}
      </Card>

      <Card inset>
        <CardHeader>
          <div>
            <CardTitle>Esami registrati ({rows.length})</CardTitle>
            <CardDescription>Ordinati per anno di corso e semestre secondo il catalogo AA {catalog.academicYear}.</CardDescription>
          </div>
        </CardHeader>
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            La carriera è vuota. Aggiungi almeno gli esami verbalizzati: senza di essi il piano non sa cosa è già chiuso.
          </p>
        )}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.courseCode} className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface-muted/40 px-4 py-2.5">
              <div className="min-w-[11rem] flex-1">
                <p className="text-sm font-medium leading-snug text-primary">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.courseCode} · {row.cfu} CFU · anno {row.courseYear} · {row.semester}° semestre
                  {row.isFinalExamModule && " · modulo di prova finale"}
                  {!row.inCatalog && " · fuori catalogo"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {row.grade && <span className="font-mono text-sm font-semibold text-success">{row.grade}</span>}
                <Badge variant={STATUS_VARIANT[row.status]}>{EXAM_STATUS_LABELS[row.status]}</Badge>
                {row.registeredAt && <span className="text-xs text-muted">verb. {formatItalianDate(row.registeredAt)}</span>}
                {row.status === "passed_unregistered" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => run("Esame verbalizzato.", () => upsertCareerExamAction({ code: row.courseCode, status: "passed_registered", grade: row.grade }))}
                    disabled={isPending}
                  >
                    Segna verbalizzato
                  </Button>
                )}
                <IconButton
                  onClick={() => run("Voce rimossa dalla carriera.", () => deleteCareerExamAction(row.courseCode))}
                  disabled={isPending}
                  label={`Rimuovi ${row.name} dalla carriera`}
                  size="md"
                  variant="ghost"
                  className="hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type ImportRow = { code: string; status: ExamStatus; grade: string | null; registeredAt: string | null; passedAt: string | null };

function parseImport(text: string): { rows: ImportRow[] } | { error: string } {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Non c'è niente da importare." };
  const rows: ImportRow[] = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split(/[;,\t]/).map((part) => part.trim());
    const code = parts[0];
    if (!code) return { error: `Riga ${index + 1}: codice corso mancante.` };
    const grade = parts[1] || null;
    const date = parts[2] || null;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: `Riga ${index + 1}: la data deve essere in formato YYYY-MM-DD.` };
    if (grade && !GRADES.includes(grade)) return { error: `Riga ${index + 1}: voto "${grade}" non valido.` };
    rows.push({ code, status: "passed_registered", grade, registeredAt: date, passedAt: date });
  }
  return { rows };
}
