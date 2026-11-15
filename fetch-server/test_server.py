"""Tests for server.py's run scheduling and per-thread DB connections."""
import importlib
import threading

import pytest


@pytest.fixture
def server(tmp_path, monkeypatch):
    # server.py creates its SQLite DB (relative path) on import.
    monkeypatch.chdir(tmp_path)
    import config
    monkeypatch.setattr(config, 'load', lambda: dict(config.DEFAULTS))
    import server as server_module
    return importlib.reload(server_module)


def test_run_requested_during_a_run_runs_again_afterwards(server, monkeypatch):
    calls = []

    def fake_run_once():
        calls.append(len(calls))
        if len(calls) == 1:
            server._do_run()  # e.g. an extension POST arriving mid-run
    monkeypatch.setattr(server, '_run_once', fake_run_once)

    server._do_run()

    assert calls == [0, 1]
    assert not server._run_lock.locked()


def test_single_run_when_nothing_else_requested(server, monkeypatch):
    calls = []
    monkeypatch.setattr(server, '_run_once', lambda: calls.append(1))

    server._do_run()

    assert calls == [1]


def test_each_thread_gets_its_own_connection(server):
    main = server._db()
    other = []
    t = threading.Thread(target=lambda: other.append(server._db()))
    t.start()
    t.join()

    assert server._db() is main
    assert other[0] is not main


def test_db_uses_wal(server):
    assert server._db().execute('PRAGMA journal_mode').fetchone()[0] == 'wal'
