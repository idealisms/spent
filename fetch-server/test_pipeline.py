"""Unit tests for email parsing and merge logic in pipeline.py."""
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pytest

from pipeline import _parse_email, _merge


# ── Email construction helpers ─────────────────────────────────────────────────

def _simple(from_addr: str, subject: str, body: str) -> str:
    """Base64url-encoded simple (non-multipart) email, as returned by Gmail API."""
    raw = f"From: {from_addr}\r\nSubject: {subject}\r\n\r\n{body}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _multipart(from_addr: str, subject: str, body: str) -> str:
    """Base64url-encoded multipart email (USAA sends these)."""
    msg = MIMEMultipart()
    msg['From'] = from_addr
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'us-ascii'))
    return base64.urlsafe_b64encode(msg.as_bytes()).decode()


# ── Chase ──────────────────────────────────────────────────────────────────────

def test_chase_debit():
    body = (
        "> Apr 27, 2026 \n"
        ">Merchant<x<td class='c'>TRADER JOE'S</td>\n"
        ">Amount<x<td class='c'>$45.00</td>\n"
    )
    t = _parse_email('id1', _simple('noreply@chase.com', 'Transaction Alert', body))
    assert t['description'] == "TRADER JOE'S"
    assert t['date'] == '2026-04-27'
    assert t['amount_cents'] == 4500
    assert t['source'] == 'email_chase'
    assert t['id'] == 'id1'


def test_chase_credit():
    body = (
        "> Jan 15, 2026 \n"
        ">Merchant<x<td class='c'>PAYMENT THANK YOU</td>\n"
        ">Credit Amount<x<td class='c'>$500.00</td>\n"
    )
    t = _parse_email('id2', _simple('alerts@chase.com', 'Payment received', body))
    assert t['description'] == 'PAYMENT THANK YOU'
    assert t['date'] == '2026-01-15'
    assert t['amount_cents'] == -50000


def test_chase_amount_with_comma():
    body = (
        "> Dec 01, 2025 \n"
        ">Merchant<x<td class='c'>BEST BUY</td>\n"
        ">Amount<x<td class='c'>$1,200.00</td>\n"
    )
    t = _parse_email('id3', _simple('noreply@chase.com', 'Transaction', body))
    assert t['amount_cents'] == 120000


def test_chase_all_months():
    months = [
        ('Jan', '01'), ('Feb', '02'), ('Mar', '03'), ('Apr', '04'),
        ('May', '05'), ('Jun', '06'), ('Jul', '07'), ('Aug', '08'),
        ('Sep', '09'), ('Oct', '10'), ('Nov', '11'), ('Dec', '12'),
    ]
    for mmm, mm in months:
        body = (
            f"> {mmm} 05, 2026 \n"
            ">Merchant<x<td class='c'>STORE</td>\n"
            ">Amount<x<td class='c'>$10.00</td>\n"
        )
        t = _parse_email('id', _simple('noreply@chase.com', 'Alert', body))
        assert t['date'] == f'2026-{mm}-05', f'Failed for month {mmm}'


# ── JPMorgan ───────────────────────────────────────────────────────────────────

def test_jpmorgan_debit():
    body = (
        "> Apr 15, 2026 \n"
        ">Merchant: <x<td class='c'> AMAZON.COM</td>\n"
        ">Authorized  amount: <x<td class='c'> $30.00  </td>\n"
    )
    t = _parse_email('id4', _simple('noreply@jpmorgan.com', 'Transaction Alert', body))
    assert t['description'] == 'AMAZON.COM'
    assert t['date'] == '2026-04-15'
    assert t['amount_cents'] == 3000
    assert t['source'] == 'email_chase'


def test_jpmorgan_incremental_amount():
    body = (
        "> Feb 10, 2026 \n"
        ">Merchant: <x<td class='c'> HOTEL INN</td>\n"
        ">Authorized  incremental amount: <x<td class='c'> $75.00  </td>\n"
    )
    t = _parse_email('id5', _simple('noreply@jpmorgan.com', 'Alert', body))
    assert t['description'] == 'HOTEL INN'
    assert t['amount_cents'] == 7500


# ── USAA ───────────────────────────────────────────────────────────────────────

def test_usaa_deposit_for():
    body = (
        "Date: 04/27/26\n"
        "From: My Employer\n"
        "You received a deposit for $1,234.00 to your account\n"
    )
    t = _parse_email('id6', _multipart(
        'notify@usaa.com', 'USAA: Your Bank Account Received a Deposit', body,
    ))
    assert t['description'] == 'My Employer'
    assert t['date'] == '2026-04-27'
    assert t['amount_cents'] == -123400
    assert t['source'] == 'email_usaa'


def test_usaa_deposit_of():
    body = (
        "Date: 03/15/26\n"
        "From: Social Security\n"
        "You received a deposit of $2,000.00 to your account\n"
    )
    t = _parse_email('id7', _multipart(
        'notify@usaa.com', 'Deposit to Your Bank Account', body,
    ))
    assert t['description'] == 'Social Security'
    assert t['date'] == '2026-03-15'
    assert t['amount_cents'] == -200000


def test_usaa_debit():
    body = (
        "Date: 04/01/26\n"
        "To: Electric Company\n"
        "$150.00 came out of your account\n"
    )
    t = _parse_email('id8', _multipart(
        'notify@usaa.com', 'Debit Alert for Your USAA Bank Account', body,
    ))
    assert t['description'] == 'Electric Company'
    assert t['date'] == '2026-04-01'
    assert t['amount_cents'] == 15000
    assert t['source'] == 'email_usaa'


# ── Routing ────────────────────────────────────────────────────────────────────

def test_unknown_email_raises():
    raw = _simple('unknown@example.com', 'Some Subject', 'body')
    with pytest.raises(ValueError, match='Unknown email format'):
        _parse_email('id9', raw)


# ── Merge / dedup ──────────────────────────────────────────────────────────────

def _tx(id, date='2026-04-27', description='STORE', source='email_usaa', amount_cents=1000):
    return {
        'id': id,
        'date': date,
        'description': description,
        'source': source,
        'amount_cents': amount_cents,
        'tags': [],
        'transactions': [],
        'notes': '',
        'original_line': 'subject',
    }


def test_merge_adds_new():
    existing = []
    added = _merge(existing, [_tx('a')], lambda _: None)
    assert len(added) == 1
    assert len(existing) == 1


def test_merge_dedup_by_id():
    existing = [_tx('a')]
    added = _merge(existing, [_tx('a')], lambda _: None)
    assert added == []
    assert len(existing) == 1


def test_merge_dedup_by_date_and_description():
    existing = [_tx('a', date='2026-04-27', description='STORE')]
    new = [_tx('b', date='2026-04-27', description='STORE')]
    added = _merge(existing, new, lambda _: None)
    assert added == []
    assert len(existing) == 1


def test_merge_different_dates_not_deduped():
    existing = [_tx('a', date='2026-04-27', description='STORE')]
    new = [_tx('b', date='2026-04-28', description='STORE')]
    added = _merge(existing, new, lambda _: None)
    assert len(added) == 1


def test_merge_sorts_by_date_descending():
    existing = [_tx('a', date='2026-01-01')]
    _merge(existing, [_tx('b', date='2026-03-01'), _tx('c', date='2025-06-01')], lambda _: None)
    dates = [t['date'] for t in existing]
    assert dates == sorted(dates, reverse=True)
