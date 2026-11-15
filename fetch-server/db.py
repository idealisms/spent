import sqlite3
from datetime import datetime, timedelta, timezone
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

-- Orders scraped from Amazon order-details pages by the browser extension,
-- waiting to be matched to card transactions in transactions.json.
CREATE TABLE IF NOT EXISTS amazon_orders (
    order_id     TEXT PRIMARY KEY,
    order_date   TEXT NOT NULL,                -- YYYY-MM-DD
    total_cents  INTEGER NOT NULL,
    items        TEXT NOT NULL,                -- JSON array of item titles
    charges      TEXT NOT NULL DEFAULT '[]',   -- JSON array of {date, amount_cents}
    url          TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending | matched
    summary      TEXT,                         -- short description from Claude
    matched_txn_ids TEXT NOT NULL DEFAULT '[]',-- JSON array of transaction ids
    received_at  TEXT NOT NULL,
    matched_at   TEXT
);

-- Amazon pages the extension couldn't scrape (or whose charges looked
-- unusual), kept so the scraper can be fixed from real HTML. One row per
-- order (or URL when the order id couldn't be read); newest replaces older.
CREATE TABLE IF NOT EXISTS amazon_debug_pages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    page_key     TEXT NOT NULL UNIQUE,
    reason       TEXT NOT NULL,
    url          TEXT,
    order_html   TEXT,
    transactions_html TEXT,
    scraped      TEXT,          -- JSON of what the extension did extract
    received_at  TEXT NOT NULL
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
        # WAL lets the web UI and extension requests read while a run writes.
        conn.execute("PRAGMA journal_mode=WAL")
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


def get_recent_runs(conn: sqlite3.Connection, days: int = 7) -> list:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    return conn.execute(
        "SELECT * FROM fetch_runs WHERE started_at >= ? ORDER BY started_at DESC",
        (since,),
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


def reset_parsed_emails_for_run(conn: sqlite3.Connection, run_id: int) -> int:
    """Mark emails from a specific run back to pending. Returns the number reset."""
    cur = conn.execute(
        "UPDATE emails SET parse_status = 'pending', parsed_at = NULL, parse_error = NULL "
        "WHERE fetch_run_id = ? AND parse_status IN ('parsed', 'error', 'skipped')",
        (run_id,),
    )
    conn.commit()
    return cur.rowcount


# --- Amazon orders ---

def upsert_amazon_order(
    conn: sqlite3.Connection,
    order_id: str,
    order_date: str,
    total_cents: int,
    items: list,
    charges: list,
    url: Optional[str],
) -> str:
    """Insert or update a scraped order; returns its status afterwards.

    Re-posting an unchanged order (revisiting the page) is a no-op. If the
    order changed (e.g. a new shipment was charged), it goes back to pending
    so it is re-matched; the summary is kept unless the items changed."""
    import json
    items_json = json.dumps(items)
    charges_json = json.dumps(charges)
    row = conn.execute(
        "SELECT * FROM amazon_orders WHERE order_id = ?", (order_id,)
    ).fetchone()
    if row is None:
        conn.execute(
            """INSERT INTO amazon_orders
                   (order_id, order_date, total_cents, items, charges, url, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (order_id, order_date, total_cents, items_json, charges_json, url, _now()),
        )
        conn.commit()
        return 'pending'
    if (row['order_date'], row['total_cents'], row['items'], row['charges']) == (
            order_date, total_cents, items_json, charges_json):
        return row['status']
    summary = row['summary'] if row['items'] == items_json else None
    conn.execute(
        """UPDATE amazon_orders
           SET order_date = ?, total_cents = ?, items = ?, charges = ?, url = ?,
               summary = ?, status = 'pending', matched_txn_ids = '[]',
               received_at = ?, matched_at = NULL
           WHERE order_id = ?""",
        (order_date, total_cents, items_json, charges_json, url, summary, _now(), order_id),
    )
    conn.commit()
    return 'pending'


def get_amazon_orders(conn: sqlite3.Connection, status: Optional[str] = None) -> list:
    """Orders oldest first (so earlier orders claim transactions first)."""
    if status:
        return conn.execute(
            "SELECT * FROM amazon_orders WHERE status = ? ORDER BY order_date, order_id",
            (status,),
        ).fetchall()
    return conn.execute(
        "SELECT * FROM amazon_orders ORDER BY order_date, order_id"
    ).fetchall()


def get_recent_amazon_orders(conn: sqlite3.Connection, limit: int = 30) -> list:
    return conn.execute(
        "SELECT * FROM amazon_orders ORDER BY received_at DESC LIMIT ?", (limit,)
    ).fetchall()


def set_amazon_summary(conn: sqlite3.Connection, order_id: str, summary: str) -> None:
    conn.execute(
        "UPDATE amazon_orders SET summary = ? WHERE order_id = ?", (summary, order_id)
    )
    conn.commit()


def mark_amazon_order_matched(conn: sqlite3.Connection, order_id: str, txn_ids: list) -> None:
    import json
    conn.execute(
        """UPDATE amazon_orders SET status = 'matched', matched_txn_ids = ?, matched_at = ?
           WHERE order_id = ?""",
        (json.dumps(txn_ids), _now(), order_id),
    )
    conn.commit()


# --- Amazon debug pages ---

MAX_DEBUG_PAGES = 100


def save_amazon_debug_page(
    conn: sqlite3.Connection,
    page_key: str,
    reason: str,
    url: Optional[str],
    order_html: Optional[str],
    transactions_html: Optional[str],
    scraped: Optional[dict],
) -> int:
    import json
    conn.execute("DELETE FROM amazon_debug_pages WHERE page_key = ?", (page_key,))
    cur = conn.execute(
        """INSERT INTO amazon_debug_pages
               (page_key, reason, url, order_html, transactions_html, scraped, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (page_key, reason, url, order_html, transactions_html,
         json.dumps(scraped) if scraped is not None else None, _now()),
    )
    conn.execute(
        """DELETE FROM amazon_debug_pages WHERE id NOT IN
               (SELECT id FROM amazon_debug_pages ORDER BY id DESC LIMIT ?)""",
        (MAX_DEBUG_PAGES,),
    )
    conn.commit()
    return cur.lastrowid


def list_amazon_debug_pages(conn: sqlite3.Connection) -> list:
    """Newest first, without the (large) HTML columns."""
    return conn.execute(
        """SELECT id, page_key, reason, url, scraped, received_at,
                  order_html IS NOT NULL AS has_order_html,
                  transactions_html IS NOT NULL AS has_transactions_html
           FROM amazon_debug_pages ORDER BY id DESC"""
    ).fetchall()


def get_amazon_debug_page(conn: sqlite3.Connection, page_id: int):
    return conn.execute(
        "SELECT * FROM amazon_debug_pages WHERE id = ?", (page_id,)
    ).fetchone()


def delete_amazon_debug_page(conn: sqlite3.Connection, page_id: int) -> None:
    conn.execute("DELETE FROM amazon_debug_pages WHERE id = ?", (page_id,))
    conn.commit()


# --- Internal ---

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
