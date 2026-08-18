"use client";
// ScheduleEditor — Client Component
//
// A controlled-form table for editing the lesson schedule.
// "Controlled" means React state (useState) holds the rows, not the DOM.
// This is the idiomatic React pattern, replacing the original app's
// "DOM as state" approach (reading values directly from <input> elements).
//
// Flow:
//   1. rows state initialized from props (server-fetched schedule)
//   2. User edits inputs → setRows updates state → React re-renders
//   3. "Salva" → saveScheduleAction(rows) → server regenerates occurrences
//      → revalidatePath("/", "layout") → all pages re-render with fresh data

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { saveScheduleAction } from "@/app/actions";
import { addCalendarDays, formatItalianDateRange, today, WEEKDAY_LABELS, WORKWEEK } from "@/lib/dates";
import { LESSON_MODE_LABELS, type LessonMode, type ScheduleRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldLabelClass, inputClass, selectClass } from "@/components/ui/Field";

// A row in the editor may or may not have an id yet (new rows don't)
type EditorRow = Omit<ScheduleRow, "id"> & { id?: number; _key: number };

let keyCounter = 0;
const newKey = () => ++keyCounter;

function rowFromSchedule(r: ScheduleRow): EditorRow {
  return { ...r, _key: newKey() };
}

function emptyRow(): EditorRow {
  const start = today();
  return {
    _key: newKey(),
    weekday: 0,
    subject: "",
    course_code: null,
    start_date: start,
    end_date: addCalendarDays(start, 120),
    mode: "asincrona",
  };
}

interface ScheduleEditorProps {
  initialRows: ScheduleRow[];
  onSaveSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function ScheduleEditor({ initialRows, onSaveSuccess, onDirtyChange }: ScheduleEditorProps) {
  const [rows, setRows] = useState<EditorRow[]>(
    initialRows.length > 0
      ? initialRows.map(rowFromSchedule)
      : [emptyRow()]
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeKey, setActiveKey] = useState<number | null>(() => rows[0]?._key ?? null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  const markDirty = () => setDirty(true);

  // Update a single field in a single row
  function updateRow(key: number, field: keyof EditorRow, value: string | number) {
    markDirty();
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    const row = emptyRow();
    setRows((prev) => [...prev, row]);
    setActiveKey(row._key);
    markDirty();
  }

  function removeRow(key: number) {
    markDirty();
    setRows((prev) => {
      const next = prev.filter((r) => r._key !== key);
      const remaining = next.length > 0 ? next : [emptyRow()];
      setActiveKey((current) => current === key ? remaining[0]._key : current);
      return remaining;
    });
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const payload = rows.map((row) => ({
        id: row.id,
        weekday: row.weekday,
        subject: row.subject,
        course_code: row.course_code,
        start_date: row.start_date,
        end_date: row.end_date,
        mode: row.mode,
      }));
      const result = await saveScheduleAction(payload);
      if (result.ok) {
        setSuccess(true);
        setDirty(false);
        onSaveSuccess?.();
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error ?? "Errore sconosciuto");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            disabled={isPending}
          >
            <Plus className="size-4" aria-hidden="true" />
            Aggiungi lezione
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !dirty}
            className="hidden md:inline-flex"
          >
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Salvataggio..." : "Salva calendario"}
          </Button>
        </div>

        <div aria-live="polite" className="min-h-7">
          {success && (
            <Badge variant="success" dot>
              Salvato
            </Badge>
          )}
          {error && (
            <Badge variant="danger" dot>
              {error}
            </Badge>
          )}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-card border border-border bg-surface/70 md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase text-muted">
            <tr>
              <th className="w-[14%] px-3 py-3 font-medium">Giorno</th>
              <th className="w-[24%] px-3 py-3 font-medium">Materia</th>
              <th className="w-[16%] px-3 py-3 font-medium">Da</th>
              <th className="w-[16%] px-3 py-3 font-medium">A</th>
              <th className="w-[14%] px-3 py-3 font-medium">Modalita</th>
              <th className="w-[16%] px-3 py-3 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr key={row._key} className="align-middle transition hover:bg-surface-hover">
                <td className="px-3 py-3">
                  <select
                    aria-label={`Giorno riga ${index + 1}`}
                    value={row.weekday}
                    onChange={(e) =>
                      updateRow(row._key, "weekday", Number(e.target.value))
                    }
                    className={selectClass("min-w-0")}
                  >
                    {WORKWEEK.map((wd) => (
                      <option key={wd} value={wd}>
                        {WEEKDAY_LABELS[wd]}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-3 py-3">
                  <input
                    aria-label={`Materia riga ${index + 1}`}
                    type="text"
                    value={row.subject}
                    onChange={(e) =>
                      updateRow(row._key, "subject", e.target.value)
                    }
                    placeholder="Nome materia"
                    className={inputClass("min-w-0")}
                  />
                  <input
                    aria-label={`Codice corso facoltativo riga ${index + 1}`}
                    type="text"
                    value={row.course_code ?? ""}
                    onChange={(e) => updateRow(row._key, "course_code", e.target.value)}
                    placeholder="Codice corso (facoltativo)"
                    maxLength={32}
                    className={inputClass("mt-2 min-w-0 text-xs")}
                  />
                </td>

                <td className="px-3 py-3">
                  <input
                    aria-label={`Data inizio riga ${index + 1}`}
                    type="date"
                    value={row.start_date}
                    onChange={(e) =>
                      updateRow(row._key, "start_date", e.target.value)
                    }
                    className={inputClass("min-w-0")}
                  />
                </td>

                <td className="px-3 py-3">
                  <input
                    aria-label={`Data fine riga ${index + 1}`}
                    type="date"
                    value={row.end_date}
                    onChange={(e) =>
                      updateRow(row._key, "end_date", e.target.value)
                    }
                    className={inputClass("min-w-0")}
                  />
                </td>

                <td className="px-3 py-3">
                  <select
                    aria-label={`Modalita riga ${index + 1}`}
                    value={row.mode}
                    onChange={(e) =>
                      updateRow(row._key, "mode", e.target.value as LessonMode)
                    }
                    className={selectClass("min-w-0")}
                  >
                    <option value="asincrona">{LESSON_MODE_LABELS.asincrona}</option>
                    <option value="presenza">{LESSON_MODE_LABELS.presenza}</option>
                  </select>
                </td>

                <td className="px-3 py-3 text-right">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeRow(row._key)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Rimuovi
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => (
          <div
            key={row._key}
            className="min-w-0 overflow-hidden rounded-card border border-border bg-surface-muted/70 shadow-inset"
          >
            <button
              type="button"
              onClick={() => setActiveKey((current) => current === row._key ? null : row._key)}
              aria-expanded={activeKey === row._key}
              className="flex w-full items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">{WEEKDAY_LABELS[row.weekday]} · lezione {index + 1}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-primary">
                  {row.subject || "Nuova materia"}
                </p>
                <p className="mt-1 text-xs text-muted">{formatItalianDateRange(row.start_date, row.end_date)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={row.mode === "presenza" ? "active" : "warning"} className="max-w-28 text-center">
                  {row.mode === "asincrona" ? "Asincrona" : "In presenza"}
                </Badge>
                <ChevronDown className={`size-4 text-muted transition ${activeKey === row._key ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </button>

            {activeKey === row._key && <div className="animate-panel-open grid min-w-0 gap-3 border-t border-border p-4">
              <label className="space-y-2">
                <span className={fieldLabelClass}>Giorno</span>
                <select
                  value={row.weekday}
                  onChange={(e) =>
                    updateRow(row._key, "weekday", Number(e.target.value))
                  }
                  className={selectClass()}
                >
                  {WORKWEEK.map((wd) => (
                    <option key={wd} value={wd}>
                      {WEEKDAY_LABELS[wd]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className={fieldLabelClass}>Codice corso (facoltativo)</span>
                <input
                  type="text"
                  value={row.course_code ?? ""}
                  onChange={(e) => updateRow(row._key, "course_code", e.target.value)}
                  placeholder="es. 085900"
                  maxLength={32}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className={fieldLabelClass}>Materia</span>
                <input
                  type="text"
                  value={row.subject}
                  onChange={(e) =>
                    updateRow(row._key, "subject", e.target.value)
                  }
                  placeholder="Nome materia"
                  className={inputClass()}
                />
              </label>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={fieldLabelClass}>Da</span>
                  <input
                    type="date"
                    value={row.start_date}
                    onChange={(e) =>
                      updateRow(row._key, "start_date", e.target.value)
                    }
                    className={inputClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={fieldLabelClass}>A</span>
                  <input
                    type="date"
                    value={row.end_date}
                    onChange={(e) =>
                      updateRow(row._key, "end_date", e.target.value)
                    }
                    className={inputClass()}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className={fieldLabelClass}>Modalita</span>
                <select
                  value={row.mode}
                  onChange={(e) =>
                    updateRow(row._key, "mode", e.target.value as LessonMode)
                  }
                  className={selectClass()}
                >
                  <option value="asincrona">{LESSON_MODE_LABELS.asincrona}</option>
                  <option value="presenza">{LESSON_MODE_LABELS.presenza}</option>
                </select>
              </label>

              <Button
                type="button"
                variant="danger"
                onClick={() => removeRow(row._key)}
                className="w-full"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Rimuovi riga
              </Button>
            </div>}
          </div>
        ))}
      </div>

      <div className="sticky z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden" style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="w-full"
        >
          <Save className="size-4" aria-hidden="true" />
          {isPending ? "Salvataggio..." : dirty ? "Salva calendario" : "Calendario salvato"}
        </Button>
      </div>
    </div>
  );
}
