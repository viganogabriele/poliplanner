# Poliplanner

Local, self-hostable planner for university students at **Politecnico di Milano** — tracks weekly lessons and manages the official study plan (*piano di studi*) for Laurea Triennale Ingegneria Informatica (Cod. 358).

**Stack:** Next.js 16 · App Router · TypeScript · Tailwind CSS 4 · SQLite (via `better-sqlite3`) · pnpm

---

## Features

| Page | Description |
|---|---|
| **Dashboard** `/dashboard` | Progress overview: lessons done vs pending, today's schedule, per-subject progress bars |
| **Lezioni** `/lessons` | Backlog of overdue/today lessons with checkbox toggling and optimistic updates |
| **Calendario** `/calendar` | Weekly schedule editor — add/edit/delete recurring lesson rules by weekday and date range |
| **Materie** `/subjects` | Per-subject CFU progress breakdown |
| **Piano di Studi** `/piano` | Full study plan builder for PoliMi Ing. Inf. Cod. 358 — track selector (I3I/I3C), course catalog, CFU validation |
| **Esami** `/esami` | Exam tracking per course — status, grade (18–30L), weighted average (*media pesata*), estimated graduation grade |
| **Impostazioni** `/settings` | Seed demo data or reset the database |

The app also registers a **service worker** for offline/PWA support and shows a browser install prompt when available.

---

## Requirements

- **Node.js ≥ 20**
- **pnpm ≥ 11**

No Python, no Docker, no external database.

---

## Quick start

```bash
git clone https://github.com/viganogabriele/poliplanner.git
cd poliplanner

# Install dependencies (better-sqlite3 compiles its native module here)
pnpm install

# Optional: seed the database with demo lesson data
pnpm db:seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production

```bash
pnpm build
pnpm start

# Custom port:
PORT=8333 pnpm start
```

Everything runs from a single Node.js process — no separate backend needed.

---

## Database

SQLite at `db/lesson_tracker.db` (created automatically on first run). The `db/` directory is tracked by git but the `.db` files are in `.gitignore`.

| Table | Purpose |
|---|---|
| `schedule` | Recurring lesson rules (weekday, subject, date range, mode) |
| `lesson_occurrence` | Materialized concrete lesson dates with done/not-done flag |
| `settings` | Key-value store (e.g. selected track: I3I/I3C) |
| `study_plan` | Courses selected in the piano di studi per year |
| `exams` | Exam status and grade per course code |

```bash
# Wipe and reseed with demo data
pnpm db:seed
```

---

## Repository structure

```
src/
  app/
    (app)/              Route group — all pages share the sidebar layout
      dashboard/
      lessons/
      calendar/
      subjects/
      piano/            Piano di Studi
      esami/            Esami & voti
      settings/
    layout.tsx          Root layout — fonts, metadata, SW registration
    actions.ts          All Server Actions (writes + revalidation)
    globals.css         Tailwind 4 + design tokens (dark theme)
  components/
    layout/AppNav.tsx   Sidebar (desktop) + top header + bottom tab bar (mobile)
    ui/                 Badge, Button, Card, Field, LiveClock, PageShell, StatTile,
                        PwaInstallButton, ServiceWorkerRegistrar
  features/
    dashboard/          ProgressChart, TodayPanel
    lessons/            TodoList (optimistic checkboxes)
    calendar/           WeeklyGrid, ScheduleEditor
    subjects/           SubjectProgress
    piano/              PianoClient, ValidationPanel, AddCourseModal
    esami/              EsamiClient
  lib/
    polimi/
      courses.ts        Complete PoliMi Ing. Inf. Cod. 358 course catalog
      constraints.ts    Graduation rules (CFU minimums, TABA, TABREC, …)
      cfuCalc.ts        CFU aggregation utilities
      gradeCalc.ts      Weighted average, laurea estimate
      validation.ts     Plan validation — returns typed issues list
    db.ts               better-sqlite3 singleton (WAL mode, survives HMR)
    schema.ts           CREATE TABLE statements + resetDatabase()
    schedule.ts         Schedule read/write + occurrence regeneration
    dashboard.ts        Dashboard queries, lesson toggle, reset completions
    piano.ts            Study plan DB operations + buildDefaultPiano()
    esami.ts            Exam status/grade DB operations
    seed.ts             Demo data for the lesson tracker
    types.ts, dates.ts, ui.ts

public/
  sw.js                 Service worker (cache-first for static chunks, network-first for HTML)
  manifest.webmanifest  PWA manifest

legacy/                 Archived Python/Flask original (not used at runtime)
db/                     SQLite database (gitignored)
```

---

## Architecture

- **Server Components** read from SQLite directly — no REST API needed for reads.
- **Server Actions** (`actions.ts`) handle all writes; each calls `revalidatePath("/")` to trigger a fresh render.
- **Client Components** (`"use client"`) are used only for interactivity: chart, live clock, lesson checkboxes, schedule editor, piano editor, exam status/grade controls.
- Lesson occurrences are a **materialized table** — regenerated from the schedule on every save, `done` state preserved for unchanged dates.
- The **Piano di Studi** is specific to PoliMi Ingegneria Informatica (Cod. 358). To adapt to a different degree, replace `src/lib/polimi/courses.ts` and `src/lib/polimi/constraints.ts`.
