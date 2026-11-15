"""Tests for Amazon order matching (amazon.py) and its wiring into pipeline.run."""
import json

import pytest

import amazon
import db
from amazon import match_order
from test_pipeline import _FakeDropboxModule


def _tx(id, date, amount_cents, description='AMAZON MKTPL*AB12CD', notes='', tags=None):
    return {
        'id': id, 'description': description, 'date': date,
        'amount_cents': amount_cents, 'tags': tags or [], 'notes': notes,
        'source': 'email_chase', 'original_line': '', 'transactions': [],
    }


def _order(order_date, total_cents, charges=None):
    return {'order_date': order_date, 'total_cents': total_cents, 'charges': charges or []}


# ── is_candidate ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize('description,expected', [
    ('AMAZON MKTPL*AB12CD', True),
    ('Amazon.com*XY34Z', True),
    ('AMZN Mktp US*1A2B3C', True),
    ('Amazon Prime*PMTS', True),  # Not "prime pmts" exactly; amount decides.
    ('AMAZON PRIME PMTS', False),
    ('WHOLEFDS MKT 10234', False),  # Whole Foods in-store purchase.
    ("TRADER JOE'S", False),
])
def test_is_candidate_by_description(description, expected):
    assert amazon.is_candidate(_tx('a', '2026-11-01', 1000, description)) is expected


def test_is_candidate_excludes_refunds_and_deleted():
    assert not amazon.is_candidate(_tx('a', '2026-11-01', -1000))
    assert not amazon.is_candidate(_tx('a', '2026-11-01', 1000, tags=['deleted']))


# ── match_order: total only ────────────────────────────────────────────────────

def test_matches_single_charge_after_order_date():
    txns = [_tx('a', '2026-11-03', 2599)]
    assert match_order(_order('2026-11-01', 2599), txns) == txns


def test_amount_tolerance_one_cent():
    txns = [_tx('a', '2026-11-03', 2600)]
    assert match_order(_order('2026-11-01', 2599), txns) == txns
    assert match_order(_order('2026-11-01', 2597), txns) is None


def test_ignores_charge_before_order_or_too_late():
    assert match_order(_order('2026-11-05', 2599), [_tx('a', '2026-11-04', 2599)]) is None
    assert match_order(_order('2026-11-01', 2599), [_tx('a', '2026-11-09', 2599)]) is None


def test_prefers_closest_date():
    txns = [_tx('late', '2026-11-06', 2599), _tx('early', '2026-11-02', 2599)]
    assert [t['id'] for t in match_order(_order('2026-11-01', 2599), txns)] == ['early']


def test_split_shipment_pair():
    txns = [_tx('a', '2026-11-02', 1000), _tx('b', '2026-11-12', 1599), _tx('c', '2026-11-03', 777)]
    assert {t['id'] for t in match_order(_order('2026-11-01', 2599), txns)} == {'a', 'b'}


# ── match_order: per-charge ────────────────────────────────────────────────────

def test_charges_all_must_match():
    order = _order('2026-11-01', 2599, [
        {'date': '2026-11-02', 'amount_cents': 1000},
        {'date': '2026-11-10', 'amount_cents': 1599},
    ])
    txns = [_tx('a', '2026-11-03', 1000), _tx('b', '2026-11-10', 1599)]
    assert [t['id'] for t in match_order(order, txns)] == ['a', 'b']
    # Second shipment not charged/posted yet: keep waiting.
    assert match_order(order, txns[:1]) is None


def test_charges_same_amount_use_distinct_transactions():
    order = _order('2026-11-01', 2000, [
        {'date': '2026-11-02', 'amount_cents': 1000},
        {'date': '2026-11-04', 'amount_cents': 1000},
    ])
    txns = [_tx('a', '2026-11-02', 1000), _tx('b', '2026-11-04', 1000)]
    assert [t['id'] for t in match_order(order, txns)] == ['a', 'b']


def test_charge_window_runs_from_order_date_to_after_charge_date():
    order = _order('2026-11-01', 1000, [{'date': '2026-11-05', 'amount_cents': 1000}])
    assert match_order(order, [_tx('a', '2026-10-31', 1000)]) is not None  # 1 day before order
    assert match_order(order, [_tx('a', '2026-10-30', 1000)]) is None
    assert match_order(order, [_tx('a', '2026-11-10', 1000)]) is not None  # 5 days after charge
    assert match_order(order, [_tx('a', '2026-11-11', 1000)]) is None


def test_card_alert_before_amazon_charge_date():
    """Chase alerts fire on authorization, around the order date, while
    Amazon's transactions page shows when the charge completed, days later
    (seen: ordered 08-21, alert 08-21, Amazon charge 08-24)."""
    order = _order('2026-08-21', 1085, [{'date': '2026-08-24', 'amount_cents': 1085}])
    assert [t['id'] for t in match_order(order, [_tx('a', '2026-08-21', 1085)])] == ['a']


def test_charge_prefers_date_closest_to_charge():
    order = _order('2026-11-01', 1000, [{'date': '2026-11-05', 'amount_cents': 1000}])
    txns = [_tx('far', '2026-11-01', 1000), _tx('near', '2026-11-06', 1000)]
    assert [t['id'] for t in match_order(order, txns)] == ['near']


def test_split_into_two_same_day_charges():
    """Seen: one shipment charged as two card transactions on the same day."""
    order = _order('2026-08-15', 10837, [
        {'date': '2026-08-16', 'amount_cents': 5161},
        {'date': '2026-08-16', 'amount_cents': 5676},
    ])
    txns = [_tx('other', '2026-08-16', 3909), _tx('a', '2026-08-16', 5676), _tx('b', '2026-08-16', 5161)]
    assert [t['id'] for t in match_order(order, txns)] == ['b', 'a']


# ── truncated_summary ──────────────────────────────────────────────────────────

def test_truncated_summary():
    assert amazon.truncated_summary(['Socks']) == 'Socks'
    assert amazon.truncated_summary(['Socks', 'Shoes']) == 'Socks (+1 more)'
    long = amazon.truncated_summary(['x' * 200])
    assert len(long) == amazon.NOTE_MAX_CHARS and long.endswith('...')


# ── DB upsert ──────────────────────────────────────────────────────────────────

@pytest.fixture
def conn(tmp_path):
    c = db.get_conn(str(tmp_path / 'test.db'))
    c.executescript(db.SCHEMA)
    yield c
    c.close()


def _post(conn, order_id='111-1', order_date='2026-11-01', total_cents=2599,
          items=('Rain boots',), charges=()):
    return db.upsert_amazon_order(conn, order_id, order_date, total_cents,
                                  list(items), list(charges), None)


def _row(conn, order_id='111-1'):
    return conn.execute('SELECT * FROM amazon_orders WHERE order_id = ?', (order_id,)).fetchone()


def test_upsert_revisit_keeps_match(conn):
    _post(conn)
    db.set_amazon_summary(conn, '111-1', 'Rain boots')
    db.mark_amazon_order_matched(conn, '111-1', ['t1'])
    assert _post(conn) == 'matched'
    assert json.loads(_row(conn)['matched_txn_ids']) == ['t1']


def test_upsert_changed_order_is_rematched(conn):
    _post(conn)
    db.set_amazon_summary(conn, '111-1', 'Rain boots')
    db.mark_amazon_order_matched(conn, '111-1', ['t1'])

    status = _post(conn, charges=[{'date': '2026-11-02', 'amount_cents': 2599}])

    assert status == 'pending'
    row = _row(conn)
    assert json.loads(row['matched_txn_ids']) == []
    assert row['summary'] == 'Rain boots'  # Same items: summary kept.

    _post(conn, items=['Snow boots'], charges=[{'date': '2026-11-02', 'amount_cents': 2599}])
    assert _row(conn)['summary'] is None


# ── apply_matches ──────────────────────────────────────────────────────────────

@pytest.fixture
def no_claude(monkeypatch):
    """Fail loudly if a test unexpectedly calls the Claude API."""
    def fail(*a, **k):
        raise AssertionError('unexpected Claude call')
    monkeypatch.setattr(amazon, 'summarize_items', fail)


def test_apply_writes_note_without_api_key(conn, no_claude):
    _post(conn, items=['Rain boots', 'Umbrella'])
    existing = [_tx('t1', '2026-11-03', 2599)]

    result = amazon.apply_matches(existing, conn, {}, lambda _: None)

    assert result.matched == {'111-1': ['t1']}
    assert result.notes_written == 1
    assert existing[0]['notes'] == 'Rain boots (+1 more)'
    assert _row(conn)['status'] == 'pending'  # Not committed until uploaded.
    amazon.commit(conn, result)
    assert _row(conn)['status'] == 'matched'


def test_apply_never_overwrites_existing_notes(conn, no_claude):
    _post(conn)
    existing = [_tx('t1', '2026-11-03', 2599, notes='birthday gift')]

    result = amazon.apply_matches(existing, conn, {}, lambda _: None)

    assert result.matched == {'111-1': ['t1']}
    assert result.notes_written == 0
    assert existing[0]['notes'] == 'birthday gift'


def test_apply_skips_transactions_claimed_by_other_orders(conn, no_claude):
    _post(conn, order_id='old')
    amazon.commit(conn, amazon.apply_matches(
        [_tx('t1', '2026-11-03', 2599)], conn, {}, lambda _: None))
    # A second order with the same amount must not reuse t1.
    _post(conn, order_id='new', order_date='2026-11-02')
    existing = [_tx('t1', '2026-11-03', 2599, notes='Rain boots'), _tx('t2', '2026-11-04', 2599)]

    result = amazon.apply_matches(existing, conn, {}, lambda _: None)

    assert result.matched == {'new': ['t2']}


def test_apply_caches_claude_summary(conn, monkeypatch):
    calls = []

    def fake_summarize(items, api_key, model):
        calls.append((items, api_key, model))
        return 'Rain boots'
    monkeypatch.setattr(amazon, 'summarize_items', fake_summarize)
    _post(conn)
    config = {'anthropic_api_key': 'k', 'anthropic_model': 'm'}

    existing = [_tx('t1', '2026-11-03', 2599)]
    amazon.apply_matches(existing, conn, config, lambda _: None)
    # Simulate an upload conflict: apply again to a fresh download.
    existing = [_tx('t1', '2026-11-03', 2599)]
    amazon.apply_matches(existing, conn, config, lambda _: None)

    assert calls == [(['Rain boots'], 'k', 'm')]
    assert existing[0]['notes'] == 'Rain boots'


def test_apply_defers_order_when_claude_fails(conn, monkeypatch):
    def failing(*a):
        raise RuntimeError('boom')
    monkeypatch.setattr(amazon, 'summarize_items', failing)
    _post(conn)
    existing = [_tx('t1', '2026-11-03', 2599)]

    result = amazon.apply_matches(existing, conn, {'anthropic_api_key': 'k'}, lambda _: None)

    assert result.matched == {}
    assert existing[0]['notes'] == ''


def test_apply_skips_gift_card_orders(conn, no_claude):
    _post(conn, total_cents=0)
    result = amazon.apply_matches([_tx('t1', '2026-11-03', 0)], conn, {}, lambda _: None)
    assert result.matched == {}


# ── pipeline.run ───────────────────────────────────────────────────────────────

@pytest.fixture
def run_env(conn, monkeypatch, no_claude):
    import pipeline
    monkeypatch.setattr(pipeline, 'gmail_service', lambda *a: None)
    monkeypatch.setattr(pipeline, '_download_new_emails', lambda *a: 0)
    mod = _FakeDropboxModule([_tx('t1', '2026-11-03', 2599)])
    monkeypatch.setattr(pipeline, 'dropbox_module', mod)
    # The fake serves transactions.json for every path; no settings.json key.
    monkeypatch.setattr(pipeline, 'load_anthropic_api_key',
                        lambda c, log: c.get('anthropic_api_key', ''))
    config = {
        'gmail_token_file': '', 'gmail_credentials_file': '', 'gmail_label_id': '',
        'dropbox_access_token': 'tok', 'dropbox_path': '/p',
    }
    return conn, mod._dbx, config


def test_run_writes_amazon_notes_and_marks_matched(run_env):
    import pipeline
    conn, dbx, config = run_env
    _post(conn)

    result = pipeline.run(conn, config, lambda _: None)

    assert result['amazon_matched'] == 1
    assert dbx._data[0]['notes'] == 'Rain boots'
    assert dbx.upload_calls == 1
    assert _row(conn)['status'] == 'matched'


def test_run_rematches_after_tracker_save_conflict(run_env):
    """A tracker save between download and upload is preserved and the note is
    applied to the fresh copy."""
    import pipeline
    conn, dbx, config = run_env
    _post(conn)
    dbx.concurrent_writes = [[
        _tx('t1', '2026-11-03', 2599, tags=['shopping']),
        _tx('manual', '2026-11-04', 500, description='COFFEE'),
    ]]

    pipeline.run(conn, config, lambda _: None)

    by_id = {t['id']: t for t in dbx._data}
    assert by_id['t1']['notes'] == 'Rain boots'
    assert by_id['t1']['tags'] == ['shopping']
    assert 'manual' in by_id


def test_run_leaves_order_pending_when_upload_fails(run_env):
    import dropbox
    import pipeline
    conn, dbx, config = run_env
    _post(conn)
    dbx.concurrent_writes = [[_tx('t1', '2026-11-03', 2599)] for _ in range(pipeline.MAX_SYNC_ATTEMPTS)]

    with pytest.raises(dropbox.exceptions.ApiError):
        pipeline.run(conn, config, lambda _: None)

    assert _row(conn)['status'] == 'pending'


def test_run_without_match_keeps_waiting(run_env):
    import pipeline
    conn, dbx, config = run_env
    _post(conn, total_cents=9999)

    result = pipeline.run(conn, config, lambda _: None)

    assert result['amazon_matched'] == 0
    assert dbx.upload_calls == 0
    assert _row(conn)['status'] == 'pending'


# ── Debug pages ────────────────────────────────────────────────────────────────

def _debug(conn, page_key='111-1', reason='no charges', html='<html>1</html>'):
    return db.save_amazon_debug_page(conn, page_key, reason, 'https://www.amazon.com/x',
                                     html, None, {'order_id': page_key})


def test_debug_page_replaces_older_copy_of_same_page(conn):
    _debug(conn, html='<html>old</html>')
    new_id = _debug(conn, reason='still broken', html='<html>new</html>')

    pages = db.list_amazon_debug_pages(conn)
    assert [(p['id'], p['reason']) for p in pages] == [(new_id, 'still broken')]
    assert pages[0]['has_order_html'] == 1
    assert pages[0]['has_transactions_html'] == 0
    assert 'order_html' not in pages[0].keys()  # Listing omits the HTML.
    assert db.get_amazon_debug_page(conn, new_id)['order_html'] == '<html>new</html>'


def test_debug_pages_are_capped(conn, monkeypatch):
    monkeypatch.setattr(db, 'MAX_DEBUG_PAGES', 3)
    for i in range(5):
        _debug(conn, page_key=f'p{i}')
    assert [p['page_key'] for p in db.list_amazon_debug_pages(conn)] == ['p4', 'p3', 'p2']


def test_delete_debug_page(conn):
    page_id = _debug(conn)
    db.delete_amazon_debug_page(conn, page_id)
    assert db.list_amazon_debug_pages(conn) == []


# ── Anthropic API key from the tracker's settings.json ────────────────────────

class _FilesDropbox:
    """Dropbox fake serving fixed files by path (missing files raise)."""
    def __init__(self, files):
        self.files = files
        self.downloads = []

    def Dropbox(self, token):
        return self

    def files_download(self, path):
        self.downloads.append(path)
        if path not in self.files:
            raise Exception('path/not_found')

        class _R:
            content = json.dumps(self.files[path]).encode()
        return None, _R()


def _key_config(**extra):
    return {'dropbox_access_token': 'tok', 'dropbox_path': '/spent tracker/transactions.json', **extra}


def test_api_key_read_from_settings_json(monkeypatch):
    import pipeline
    fake = _FilesDropbox({'/spent tracker/settings.json': {'anthropicApiKey': ' sk-tracker '}})
    monkeypatch.setattr(pipeline, 'dropbox_module', fake)

    key = pipeline.load_anthropic_api_key(_key_config(anthropic_api_key='sk-config'), lambda _: None)

    assert key == 'sk-tracker'
    assert fake.downloads == ['/spent tracker/settings.json']


def test_api_key_falls_back_to_config(monkeypatch):
    import pipeline
    logs = []
    monkeypatch.setattr(pipeline, 'dropbox_module', _FilesDropbox({}))
    assert pipeline.load_anthropic_api_key(_key_config(anthropic_api_key='sk-config'), logs.append) == 'sk-config'
    assert 'settings.json' in logs[0]

    monkeypatch.setattr(pipeline, 'dropbox_module', _FilesDropbox({'/spent tracker/settings.json': {}}))
    assert pipeline.load_anthropic_api_key(_key_config(), lambda _: None) == ''


def test_run_uses_settings_json_key_for_summaries(run_env, monkeypatch):
    import pipeline
    conn, dbx, config = run_env
    _post(conn)
    monkeypatch.setattr(pipeline, 'load_anthropic_api_key', lambda c, log: 'sk-tracker')
    keys = []

    def fake_summarize(items, api_key, model):
        keys.append(api_key)
        return 'Rain boots'
    monkeypatch.setattr(amazon, 'summarize_items', fake_summarize)

    pipeline.run(conn, config, lambda _: None)

    assert keys == ['sk-tracker']
    assert dbx._data[0]['notes'] == 'Rain boots'


def test_run_skips_settings_lookup_without_pending_orders(run_env, monkeypatch):
    import pipeline
    conn, dbx, config = run_env

    def fail(*a):
        raise AssertionError('settings.json should not be read')
    monkeypatch.setattr(pipeline, 'load_anthropic_api_key', fail)

    pipeline.run(conn, config, lambda _: None)
