import sqlite3
from datetime import datetime, timezone
from typing import Optional


SCHEMA = """
CREATE TABLE IF NOT EXISTS fetch_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT NOT NULL DEFAULT 'running',  -- running | success | error
    log         TEXT NOT NULL DEFAULT '',
    emails_downloaded   INTEGER NOT NULL DEFAULT 0,
    emails_parsed       INTEGER NOT NULL DEFAULT 0,
    transactions_added  INTEGER NOT NULL DEFAULT 0,
    added_transactions  TEXT     -- JSON array of transaction dicts
);

CREATE TABLE IF NOT EXISTS emails (
    gmail_id     TEXT PRIMARY KEY,
    raw_content  TEXT NOT NULL,
    subject      TEXT,
    from_addr    TEXT,
    downloaded_at TEXT NOT NULL,
    fetch_run_id  INTEGER REFERENCES fetch_runs(id),
    parse_status  TEXT NOT NULL DEFAULT 'pending',  -- pending | parsed | error | skipped
    parsed_at     TEXT,
    parse_error   TEXT
);
"""
# gmail_id doubles as the transaction id in transactions.json for email-sourced
# transactions, so no separate transaction_id column is needed.


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str) -> None:
    with get_conn(db_path) as conn:
        conn.executescript(SCHEMA)
        # Migrate existing DBs that predate the added_transactions column.
        try:
            conn.execute("ALTER TABLE fetch_runs ADD COLUMN added_transactions TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass


# --- Runs ---

def start_run(conn: sqlite3.Connection) -> int:
    now = _now()
    cur = conn.execute("INSERT INTO fetch_runs (started_at) VALUES (?)", (now,))
    conn.commit()
    return cur.lastrowid


def append_log(conn: sqlite3.Connection, run_id: int, line: str) -> None:
    conn.execute(
        "UPDATE fetch_runs SET log = log || ? WHERE id = ?",
        (line + "\n", run_id),
    )
    conn.commit()


def finish_run(
    conn: sqlite3.Connection,
    run_id: int,
    status: str,
    emails_downloaded: int = 0,
    emails_parsed: int = 0,
    transactions_added: int = 0,
    added_transactions: Optional[list] = None,
) -> None:
    import json
    conn.execute(
        """UPDATE fetch_runs
           SET finished_at = ?, status = ?,
               emails_downloaded = ?, emails_parsed = ?, transactions_added = ?,
               added_transactions = ?
           WHERE id = ?""",
        (_now(), status, emails_downloaded, emails_parsed, transactions_added,
         json.dumps(added_transactions) if added_transactions else None, run_id),
    )
    conn.commit()


def get_recent_runs(conn: sqlite3.Connection, limit: int = 20) -> list:
    return conn.execute(
        "SELECT * FROM fetch_runs ORDER BY started_at DESC LIMIT ?", (limit,)
    ).fetchall()


def get_run(conn: sqlite3.Connection, run_id: int):
    return conn.execute(
        "SELECT * FROM fetch_runs WHERE id = ?", (run_id,)
    ).fetchone()


# --- Emails ---

def is_email_seen(conn: sqlite3.Connection, gmail_id: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM emails WHERE gmail_id = ?", (gmail_id,)
    ).fetchone() is not None


def save_email(
    conn: sqlite3.Connection,
    gmail_id: str,
    raw_content: str,
    subject: Optional[str],
    from_addr: Optional[str],
    fetch_run_id: int,
) -> None:
    conn.execute(
        """INSERT INTO emails
               (gmail_id, raw_content, subject, from_addr, downloaded_at, fetch_run_id)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (gmail_id, raw_content, subject, from_addr, _now(), fetch_run_id),
    )
    conn.commit()


def mark_email_parsed(conn: sqlite3.Connection, gmail_id: str) -> None:
    conn.execute(
        "UPDATE emails SET parse_status = 'parsed', parsed_at = ? WHERE gmail_id = ?",
        (_now(), gmail_id),
    )
    conn.commit()


def mark_email_error(conn: sqlite3.Connection, gmail_id: str, error: str) -> None:
    conn.execute(
        "UPDATE emails SET parse_status = 'error', parsed_at = ?, parse_error = ? WHERE gmail_id = ?",
        (_now(), error, gmail_id),
    )
    conn.commit()


def get_emails_pending_parse(conn: sqlite3.Connection) -> list:
    """All emails not yet successfully parsed — used for initial parse and re-parse."""
    return conn.execute(
        "SELECT * FROM emails WHERE parse_status IN ('pending', 'error') ORDER BY downloaded_at"
    ).fetchall()


def get_run_emails(conn: sqlite3.Connection, run_id: int) -> list:
    return conn.execute(
        "SELECT * FROM emails WHERE fetch_run_id = ? ORDER BY downloaded_at",
        (run_id,),
    ).fetchall()


def get_runs_since(conn: sqlite3.Connection, since_iso: str) -> list:
    """Returns runs that finished successfully since since_iso with at least one transaction."""
    return conn.execute(
        """SELECT * FROM fetch_runs
           WHERE started_at >= ? AND status = 'success' AND transactions_added > 0
           ORDER BY started_at""",
        (since_iso,),
    ).fetchall()


def reset_parsed_emails(conn: sqlite3.Connection) -> int:
    """Mark all parsed emails back to pending so they will be re-parsed on next run.
    Returns the number of emails reset."""
    cur = conn.execute(
        "UPDATE emails SET parse_status = 'pending', parsed_at = NULL, parse_error = NULL "
        "WHERE parse_status = 'parsed'"
    )
    conn.commit()
    return cur.rowcount


# --- Internal ---

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
