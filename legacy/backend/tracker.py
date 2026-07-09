from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_file

# =========================
# Paths / app config
# =========================

APP_PORT = 8333

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
LOG_DIR = ROOT_DIR / "log"

DB_DIR = ROOT_DIR / "db"
DB_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DB_DIR / "lesson_tracker.db"
MANIFEST_PATH = BACKEND_DIR / "manifest.json"
SW_PATH = BACKEND_DIR / "sw.js"
ICON_PATH = BACKEND_DIR / "icon.svg"
HTML_PATH = FRONTEND_DIR / "index.html"

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=LOG_DIR / "tracker.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

app = Flask(__name__)

# =========================
# Constants
# =========================

WEEKDAY_MAP = {
    0: "Lunedì",
    1: "Martedì",
    2: "Mercoledì",
    3: "Giovedì",
    4: "Venerdì",
    5: "Sabato",
    6: "Domenica",
}

MON_TO_NUM = {
    "Lunedì": 0,
    "Martedì": 1,
    "Mercoledì": 2,
    "Giovedì": 3,
    "Venerdì": 4,
    "Sabato": 5,
    "Domenica": 6,
}

VALID_MODES = {"presenza", "asincrona"}

DEFAULT_SCHEDULE = [
    {
        "weekday": "Lunedì",
        "subject": "Algoritmi e Principi dell'Informatica",
        "start_date": "2026-03-02",
        "end_date": "2026-06-01",
        "mode": "presenza",
    },
]

# =========================
# DB helpers
# =========================

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                weekday TEXT NOT NULL,
                subject TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'asincrona'
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS lesson_occurrence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                weekday TEXT NOT NULL,
                lesson_date TEXT NOT NULL,
                mode TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                UNIQUE(subject, lesson_date)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_occurrence_lesson_date ON lesson_occurrence(lesson_date)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_occurrence_done_date ON lesson_occurrence(done, lesson_date)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_schedule_weekday ON schedule(weekday)"
        )

        conn.commit()

    seed_if_empty()
    ensure_occurrences_uptodate()
    logging.info("Database initialized at %s", DB_PATH)


def seed_if_empty() -> None:
    with get_conn() as conn:
        existing = conn.execute("SELECT COUNT(*) AS c FROM schedule").fetchone()["c"]
        if existing > 0:
            return

        conn.executemany(
            """
            INSERT INTO schedule (weekday, subject, start_date, end_date, mode)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    row["weekday"],
                    row["subject"],
                    row["start_date"],
                    row["end_date"],
                    row["mode"],
                )
                for row in DEFAULT_SCHEDULE
            ],
        )
        conn.commit()

    logging.info("Default schedule seeded")


def get_meta(conn: sqlite3.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM app_meta WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_meta(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        """
        INSERT INTO app_meta (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """,
        (key, value),
    )

# =========================
# Schedule logic
# =========================

def daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def compute_schedule_hash(rows: list[sqlite3.Row]) -> str:
    payload = [
        {
            "weekday": r["weekday"],
            "subject": r["subject"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "mode": r["mode"],
        }
        for r in rows
    ]
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def normalize_and_validate_schedule_rows(rows: list[dict[str, Any]]) -> list[tuple[str, str, str, str, str]]:
    cleaned: list[tuple[str, str, str, str, str]] = []

    for row in rows:
        weekday = str(row.get("weekday", "")).strip()
        subject = str(row.get("subject", "")).strip()
        start_date = str(row.get("start_date", "")).strip()
        end_date = str(row.get("end_date", "")).strip()
        mode = str(row.get("mode", "asincrona")).strip() or "asincrona"

        if not (weekday and subject and start_date and end_date):
            continue

        if weekday not in MON_TO_NUM:
            continue

        if mode not in VALID_MODES:
            continue

        try:
            start_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            continue

        if end_obj < start_obj:
            continue

        cleaned.append((weekday, subject, start_date, end_date, mode))

    return cleaned


def regenerate_occurrences(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT weekday, subject, start_date, end_date, mode
        FROM schedule
        ORDER BY weekday, subject, start_date, end_date
        """
    ).fetchall()

    desired: dict[tuple[str, str], dict[str, str]] = {}

    for row in rows:
        try:
            start = datetime.strptime(row["start_date"], "%Y-%m-%d").date()
            end = datetime.strptime(row["end_date"], "%Y-%m-%d").date()
        except ValueError:
            continue

        target_weekday = MON_TO_NUM.get(row["weekday"])
        if target_weekday is None:
            continue

        for day in daterange(start, end):
            if day.weekday() == target_weekday:
                key = (row["subject"], day.isoformat())
                desired[key] = {
                    "subject": row["subject"],
                    "weekday": row["weekday"],
                    "lesson_date": day.isoformat(),
                    "mode": row["mode"],
                }

    existing = conn.execute(
        "SELECT id, subject, lesson_date FROM lesson_occurrence"
    ).fetchall()
    existing_keys = {(r["subject"], r["lesson_date"]): r["id"] for r in existing}

    to_insert: list[tuple[str, str, str, str]] = []
    to_update: list[tuple[str, str, int]] = []
    to_delete: list[tuple[int]] = []

    for key, payload in desired.items():
        if key not in existing_keys:
            to_insert.append(
                (
                    payload["subject"],
                    payload["weekday"],
                    payload["lesson_date"],
                    payload["mode"],
                )
            )
        else:
            to_update.append(
                (
                    payload["weekday"],
                    payload["mode"],
                    existing_keys[key],
                )
            )

    desired_keys = set(desired.keys())
    for key, row_id in existing_keys.items():
        if key not in desired_keys:
            to_delete.append((row_id,))

    if to_insert:
        conn.executemany(
            """
            INSERT INTO lesson_occurrence (subject, weekday, lesson_date, mode, done)
            VALUES (?, ?, ?, ?, 0)
            """,
            to_insert,
        )

    if to_update:
        conn.executemany(
            """
            UPDATE lesson_occurrence
            SET weekday = ?, mode = ?
            WHERE id = ?
            """,
            to_update,
        )

    if to_delete:
        conn.executemany(
            "DELETE FROM lesson_occurrence WHERE id = ?",
            to_delete,
        )

    schedule_hash = compute_schedule_hash(rows)
    set_meta(conn, "schedule_hash", schedule_hash)
    conn.commit()

    logging.info(
        "Occurrences regenerated: insert=%s update=%s delete=%s",
        len(to_insert),
        len(to_update),
        len(to_delete),
    )


def ensure_occurrences_uptodate() -> None:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT weekday, subject, start_date, end_date, mode
            FROM schedule
            ORDER BY weekday, subject, start_date, end_date
            """
        ).fetchall()

        current_hash = compute_schedule_hash(rows)
        saved_hash = get_meta(conn, "schedule_hash")

        if saved_hash != current_hash:
            regenerate_occurrences(conn)

# =========================
# Read models
# =========================

def schedule_rows() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT weekday, subject, start_date, end_date, mode
            FROM schedule
            ORDER BY CASE weekday
                WHEN 'Lunedì' THEN 1
                WHEN 'Martedì' THEN 2
                WHEN 'Mercoledì' THEN 3
                WHEN 'Giovedì' THEN 4
                WHEN 'Venerdì' THEN 5
                WHEN 'Sabato' THEN 6
                WHEN 'Domenica' THEN 7
            END, subject
            """
        ).fetchall()

    return [dict(r) for r in rows]


def subject_progress_payload(conn: sqlite3.Connection, today: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
            subject,
            COUNT(*) AS total_all,
            COALESCE(SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END), 0) AS done_all,
            COALESCE(SUM(CASE WHEN lesson_date < ? AND done = 0 THEN 1 ELSE 0 END), 0) AS pending_backlog
        FROM lesson_occurrence
        GROUP BY subject
        ORDER BY subject
        """,
        (today,),
    ).fetchall()

    output: list[dict[str, Any]] = []

    for r in rows:
        total = int(r["total_all"] or 0)
        done = int(r["done_all"] or 0)
        pending = int(r["pending_backlog"] or 0)
        base = done + pending
        progress = round((done / base) * 100) if base else 100

        output.append(
            {
                "subject": r["subject"],
                "total": base,
                "done": done,
                "pending": pending,
                "progress_percent": progress,
            }
        )

    return output


def dashboard_payload() -> dict[str, Any]:
    ensure_occurrences_uptodate()

    today = date.today().isoformat()
    weekday_name = WEEKDAY_MAP[date.today().weekday()]

    with get_conn() as conn:
        counts = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END), 0) AS done
            FROM lesson_occurrence
            """
        ).fetchone()

        todo_rows = conn.execute(
            """
            SELECT id, subject, weekday, lesson_date, mode, done
            FROM lesson_occurrence
            WHERE lesson_date <= ?
              AND done = 0
            ORDER BY lesson_date DESC, subject ASC
            """,
            (today,),
        ).fetchall()

        today_count = conn.execute(
            """
            SELECT COUNT(*) AS c
            FROM lesson_occurrence
            WHERE lesson_date = ?
            """,
            (today,),
        ).fetchone()["c"]

        subject_progress = subject_progress_payload(conn, today)

    done = int(counts["done"] or 0)

    visible_items: list[dict[str, Any]] = []

    for r in todo_rows:
        lesson_date = r["lesson_date"]

        if lesson_date < today:
            status = "late"
        elif lesson_date == today:
            status = "today"
        else:
            status = "future"

        visible_items.append(
            {
                "id": r["id"],
                "subject": r["subject"],
                "weekday": r["weekday"],
                "lesson_date": lesson_date,
                "mode": r["mode"],
                "done": False,
                "status": status,
            }
        )

    backlog_total = len(visible_items)
    progress_base = done + backlog_total
    progress_percent = round((done / progress_base) * 100) if progress_base else 100

    now_local = datetime.now()

    return {
        "today": today,
        "today_weekday": weekday_name,
        "today_count": today_count,
        "now_time": now_local.strftime("%H:%M:%S"),
        "total_count": progress_base,
        "done_count": done,
        "pending_count": backlog_total,
        "progress_percent": progress_percent,
        "todo_items": visible_items,
        "subject_progress": subject_progress,
    }

# =========================
# Static / frontend routes
# =========================

@app.get("/")
def home():
    return send_file(HTML_PATH, mimetype="text/html")


@app.get("/manifest.webmanifest")
def manifest():
    return send_file(MANIFEST_PATH, mimetype="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return send_file(SW_PATH, mimetype="application/javascript")


@app.get("/icon.svg")
def icon():
    return send_file(ICON_PATH, mimetype="image/svg+xml")

# =========================
# API routes
# =========================

@app.get("/api/schedule")
def get_schedule():
    return jsonify({"rows": schedule_rows()})


@app.post("/api/schedule")
def set_schedule():
    payload = request.get_json(force=True)
    rows = payload.get("rows", [])
    cleaned = normalize_and_validate_schedule_rows(rows)

    with get_conn() as conn:
        conn.execute("DELETE FROM schedule")
        conn.executemany(
            """
            INSERT INTO schedule (weekday, subject, start_date, end_date, mode)
            VALUES (?, ?, ?, ?, ?)
            """,
            cleaned,
        )
        conn.commit()

    ensure_occurrences_uptodate()
    logging.info("Schedule saved: rows=%s", len(cleaned))
    return jsonify({"ok": True, "rows_saved": len(cleaned)})


@app.get("/api/dashboard")
def get_dashboard():
    return jsonify(dashboard_payload())


@app.post("/api/lesson/<int:lesson_id>/toggle")
def toggle_lesson(lesson_id: int):
    payload = request.get_json(force=True)
    done = 1 if payload.get("done") else 0

    with get_conn() as conn:
        conn.execute(
            "UPDATE lesson_occurrence SET done = ? WHERE id = ?",
            (done, lesson_id),
        )
        conn.commit()

    logging.info("Lesson toggled: id=%s done=%s", lesson_id, done)
    return jsonify({"ok": True})


@app.post("/api/reset-completions")
def reset_completions():
    with get_conn() as conn:
        conn.execute("UPDATE lesson_occurrence SET done = 0")
        conn.commit()

    logging.info("All lesson completions reset")
    return jsonify({"ok": True})

# =========================
# Startup
# =========================

if __name__ == "__main__":
    init_db()
    logging.info("Starting Lesson Tracker on port %s", APP_PORT)
    app.run(host="0.0.0.0", port=APP_PORT, debug=False)
