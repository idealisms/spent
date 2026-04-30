"""Unit tests for db.py helper functions."""
from datetime import datetime, timedelta, timezone

import pytest

import db


@pytest.fixture
def conn(tmp_path):
    c = db.get_conn(str(tmp_path / 'test.db'))
    c.executescript(db.SCHEMA)
    yield c
    c.close()


def _tx(id, date='2026-04-27', description='STORE'):
    return {
        'id': id,
        'date': date,
        'description': description,
        'source': 'email_chase',
        'amount_cents': 1000,
        'tags': [],
        'transactions': [],
        'notes': '',
        'original_line': 'subject',
    }


# ── get_recently_added_transactions ───────────────────────────────────────────

def test_recently_added_empty_when_no_runs(conn):
    assert db.get_recently_added_transactions(conn) == []


def test_recently_added_returns_transactions_from_successful_run(conn):
    run_id = db.start_run(conn)
    db.finish_run(conn, run_id, 'success', added_transactions=[_tx('a'), _tx('b')])
    result = db.get_recently_added_transactions(conn)
    assert [t['id'] for t in result] == ['a', 'b']


def test_recently_added_excludes_failed_runs(conn):
    run_id = db.start_run(conn)
    db.finish_run(conn, run_id, 'error', added_transactions=[_tx('a')])
    assert db.get_recently_added_transactions(conn) == []


def test_recently_added_excludes_runs_with_no_transactions(conn):
    run_id = db.start_run(conn)
    db.finish_run(conn, run_id, 'success')  # added_transactions omitted
    assert db.get_recently_added_transactions(conn) == []


def test_recently_added_deduplicates_across_runs(conn):
    run1 = db.start_run(conn)
    db.finish_run(conn, run1, 'success', added_transactions=[_tx('a')])
    run2 = db.start_run(conn)
    db.finish_run(conn, run2, 'success', added_transactions=[_tx('a'), _tx('b')])

    result = db.get_recently_added_transactions(conn)
    ids = [t['id'] for t in result]
    assert ids.count('a') == 1
    assert 'b' in ids


def test_recently_added_excludes_runs_older_than_days(conn):
    run_id = db.start_run(conn)
    db.finish_run(conn, run_id, 'success', added_transactions=[_tx('old')])
    # Backdate to 8 days ago, outside the default 7-day window.
    old_ts = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
    conn.execute('UPDATE fetch_runs SET started_at = ? WHERE id = ?', (old_ts, run_id))
    conn.commit()

    assert db.get_recently_added_transactions(conn, days=7) == []


def test_recently_added_includes_run_at_boundary(conn):
    run_id = db.start_run(conn)
    db.finish_run(conn, run_id, 'success', added_transactions=[_tx('edge')])
    # Backdate to exactly 6 days ago — still within the 7-day window.
    recent_ts = (datetime.now(timezone.utc) - timedelta(days=6)).isoformat()
    conn.execute('UPDATE fetch_runs SET started_at = ? WHERE id = ?', (recent_ts, run_id))
    conn.commit()

    result = db.get_recently_added_transactions(conn, days=7)
    assert len(result) == 1
    assert result[0]['id'] == 'edge'
