"""
Fetch pipeline: Gmail → SQLite → Dropbox.

Entry point: run(conn, config, log)
  - Downloads unseen emails from Gmail into the emails table
  - Parses all pending/error emails into transactions
  - Merges new transactions into transactions.json on Dropbox

Re-parse flow: call db.reset_parsed_emails(conn) before run() to re-parse
all stored emails from scratch (useful after fixing a regex).
"""
import base64
import email as email_lib
import html
import json
import os
import re
import sqlite3
import webbrowser
from typing import Callable, Optional

import dropbox as dropbox_module
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

import db


SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
]

Log = Callable[[str], None]


# ── Gmail ──────────────────────────────────────────────────────────────────────

def gmail_service(token_file: str, credentials_file: str):
    """Return an authenticated Gmail API service, refreshing the token as needed.

    The initial OAuth flow (run_local_server) must be done interactively once:
        python pipeline.py --setup
    After that the refresh token handles re-auth automatically.
    """
    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            try:
                creds = flow.run_local_server(port=0)
            except webbrowser.Error:
                creds = flow.run_console()
        with open(token_file, 'w') as f:
            f.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)


def _download_new_emails(conn, service, label_id: str, run_id: int, log: Log) -> int:
    results = service.users().messages().list(
        userId='me', labelIds=[label_id], maxResults=50
    ).execute()
    messages = results.get('messages', [])
    downloaded = 0
    for m in messages:
        gmail_id = m['id']
        if db.is_email_seen(conn, gmail_id):
            continue
        result = service.users().messages().get(
            userId='me', id=gmail_id, format='raw'
        ).execute()
        raw = result['raw']
        decoded = base64.urlsafe_b64decode(raw).decode('utf-8', errors='replace')
        msg = email_lib.message_from_string(decoded)
        db.save_email(
            conn, gmail_id, raw,
            subject=msg.get('Subject'),
            from_addr=msg.get('From'),
            fetch_run_id=run_id,
        )
        log(f'Downloaded: {msg.get("Subject", gmail_id)}')
        downloaded += 1
    return downloaded


# ── Email parsing ──────────────────────────────────────────────────────────────
# Adapted from fetch-transactions/import.py. Edit patterns here to fix parsing;
# then call db.reset_parsed_emails() + run() to replay against stored emails.

CHASE_PATTERNS = {
    'source': 'email_chase',
    'description': r'>Merchant<[^<]+<td [^>]+>(?P<description>[^<]+)</td>',
    'amount': r'>Amount<[^<]+<td [^>]+>[$](?P<amount>[0-9.,]+)</td>',
    'credit amount': r'>Credit Amount<[^<]+<td [^>]+>[$](?P<amount>[0-9.,]+)</td>',
}

JPMORGAN_PATTERNS = {
    'source': 'email_chase',
    'description': r'>Merchant: <[^<]+<td [^>]+> (?P<description>[^<]+)</td>',
    'amount': (r'>Authorized  (incremental )?amount:'
               r'(<sup[^<]+<str[^<]+</strong></sup>)?'
               r' <[^<]+<td [^>]+> [$](?P<amount>[0-9.,]+)  </td>'),
}

USAA_DEPOSIT_PATTERNS = {
    'source': 'email_usaa',
    'description': r'From: (?P<description>[A-Za-z ]+)',
    'amount': r'NOTHING_NOT_IN_EMAIL',
    'credit amount': r'You received a deposit for [$](?P<amount>[0-9.,]+) to your',
}

USAA2_DEPOSIT_PATTERNS = {
    'source': 'email_usaa',
    'description': r'From: (?P<description>[A-Za-z ]+)',
    'amount': r'NOTHING_NOT_IN_EMAIL',
    'credit amount': r'You received a deposit of [$](?P<amount>[0-9.,]+) to your',
}

USAA_DEBIT_PATTERNS = {
    'source': 'email_usaa',
    'description': r'To: (?P<description>[A-Za-z ]+)',
    'amount': r'[$](?P<amount>[0-9.,]+) came out of your account',
}


def _email_to_transaction(gmail_id: str, msg, patterns: dict) -> dict:
    body = (msg.get_payload()
        .replace('=\r\n', '')
        .replace('=3D', '=')
        .replace('=C2=A0', ' ')
        .replace('=0D=09', ' ')
    )

    m = re.search(r'> ?(?P<mmm>\w+) (?P<dd>\d+), (?P<yyyy>\d+) ', body, re.MULTILINE | re.DOTALL)
    if m:
        mm = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        }[m.group('mmm')]
        dd = m.group('dd').zfill(2)
        yyyy = m.group('yyyy')
    else:
        m = re.search(r'Date: (?P<mm>\d\d)/(?P<dd>\d\d)/(?P<yy>\d\d)', body, re.MULTILINE | re.DOTALL)
        mm, dd, yyyy = m.group('mm'), m.group('dd'), '20' + m.group('yy')
    date = f'{yyyy}-{mm}-{dd}'

    m = re.search(patterns['description'], body, re.MULTILINE | re.DOTALL)
    description = m.group('description')

    m = re.search(patterns['amount'], body, re.MULTILINE | re.DOTALL)
    multiplier = 1
    if not m:
        m = re.search(patterns['credit amount'], body, re.MULTILINE | re.DOTALL)
        multiplier = -1
    amount = int(float(m.group('amount').replace(',', '')) * 100.0 * multiplier)

    return {
        'id': gmail_id,
        'description': description,
        'original_line': msg.get('Subject') or gmail_id,
        'date': date,
        'tags': [],
        'amount_cents': amount,
        'transactions': [],
        'source': patterns['source'],
        'notes': '',
    }


def _parse_email(gmail_id: str, raw_content: str) -> dict:
    decoded = base64.urlsafe_b64decode(raw_content).decode('utf-8', errors='replace')
    msg = email_lib.message_from_string(decoded)
    from_addr = msg.get('From', '')
    subject = msg.get('Subject', '')

    if '@chase.com' in from_addr:
        return _email_to_transaction(gmail_id, msg, CHASE_PATTERNS)
    elif '@jpmorgan.com' in from_addr:
        return _email_to_transaction(gmail_id, msg, JPMORGAN_PATTERNS)
    elif 'USAA: Your Bank Account Received a Deposit' in subject:
        return _email_to_transaction(gmail_id, msg.get_payload()[0], USAA_DEPOSIT_PATTERNS)
    elif 'Deposit to Your Bank Account' in subject:
        return _email_to_transaction(gmail_id, msg.get_payload()[0], USAA2_DEPOSIT_PATTERNS)
    elif 'Debit Alert for Your USAA Bank Account' in subject:
        return _email_to_transaction(gmail_id, msg.get_payload()[0], USAA_DEBIT_PATTERNS)
    else:
        raise ValueError(f'Unknown email format: from={from_addr!r} subject={subject!r}')


def _parse_pending_emails(conn, log: Log) -> list:
    pending = db.get_emails_pending_parse(conn)
    transactions = []
    for row in pending:
        gmail_id = row['gmail_id']
        try:
            t = _parse_email(gmail_id, row['raw_content'])
            db.mark_email_parsed(conn, gmail_id)
            transactions.append(t)
            log(f'Parsed: {t["description"]}  {t["date"]}')
        except Exception as e:
            db.mark_email_error(conn, gmail_id, str(e))
            log(f'Parse error {gmail_id}: {e}')
    log(f'Parsed {len(transactions)}/{len(pending)} pending email(s)')
    return transactions


# ── Dropbox ───────────────────────────────────────────────────────────────────

def _format_description(t: dict) -> str:
    """Canonical string used for dedup across sources."""
    if t.get('source', '').startswith('chase'):
        parts = t['original_line'].split(',')
        posted_date = parts[2] if len(parts[2].split('/')) > 1 else parts[1]
        mo, day, yr = posted_date.split('/')
        return f'{yr}-{mo}-{day} {html.unescape(t["description"])}'
    return f'{t["date"]} {t["description"]}'


def _walk_transactions(transactions):
    seen_ids, seen_descs = set(), set()
    for t in transactions:
        seen_ids.add(t['id'])
        if not t.get('source', '').startswith('ofx'):
            seen_descs.add(_format_description(t))
        sub_ids, sub_descs = _walk_transactions(t.get('transactions', []))
        seen_ids |= sub_ids
        seen_descs |= sub_descs
    return seen_ids, seen_descs


def _merge(existing: list, new_transactions: list, log: Log) -> list:
    seen_ids, seen_descs = _walk_transactions(existing)
    added = []
    for t in new_transactions:
        if t['id'] in seen_ids or _format_description(t) in seen_descs:
            continue
        existing.append(t)
        seen_ids.add(t['id'])
        added.append(t)
        log(f'  + {t["description"]}  {t["date"]}')
    existing.sort(key=lambda t: t['date'], reverse=True)
    return added


def sync_to_dropbox(new_transactions: list, access_token: str, dropbox_path: str, log: Log) -> list:
    """Merge new_transactions into transactions.json on Dropbox. Returns list of added transactions."""
    dbx = dropbox_module.Dropbox(access_token)
    _, response = dbx.files_download(dropbox_path)
    existing = json.loads(response.content.decode('utf-8'))
    added = _merge(existing, new_transactions, log)
    if added:
        dbx.files_upload(
            json.dumps(existing).encode('utf-8'),
            dropbox_path,
            dropbox_module.files.WriteMode.overwrite,
        )
        log(f'Uploaded {len(added)} new transaction(s) to Dropbox')
    else:
        log('No new transactions to upload')
    return added


# ── Entry point ───────────────────────────────────────────────────────────────

def run(conn: sqlite3.Connection, config: dict, log: Log) -> dict:
    """
    Run the full fetch pipeline. config keys:
      dropbox_access_token, dropbox_path, gmail_label_id,
      gmail_token_file, gmail_credentials_file
    """
    run_id = db.start_run(conn)

    def _log(line: str) -> None:
        log(line)
        db.append_log(conn, run_id, line)

    try:
        service = gmail_service(config['gmail_token_file'], config['gmail_credentials_file'])
        downloaded = _download_new_emails(conn, service, config['gmail_label_id'], run_id, _log)
        _log(f'Downloaded {downloaded} new email(s) from Gmail')

        new_transactions = _parse_pending_emails(conn, _log)

        added = sync_to_dropbox(
            new_transactions,
            config['dropbox_access_token'],
            config['dropbox_path'],
            _log,
        )

        db.finish_run(conn, run_id, 'success',
                      emails_downloaded=downloaded,
                      emails_parsed=len(new_transactions),
                      transactions_added=len(added),
                      added_transactions=added)
        return {'run_id': run_id, 'status': 'success',
                'downloaded': downloaded, 'parsed': len(new_transactions), 'added': len(added)}

    except Exception as e:
        _log(f'Fatal error: {e}')
        db.finish_run(conn, run_id, 'error')
        raise


# ── One-time Gmail auth setup ─────────────────────────────────────────────────

def send_email(config: dict, to: str, subject: str, body: str) -> None:
    """Send an email via the Gmail API using the existing OAuth credentials."""
    import base64
    from email.mime.text import MIMEText
    service = gmail_service(config['gmail_token_file'], config['gmail_credentials_file'])
    msg = MIMEText(body)
    msg['To'] = to
    msg['Subject'] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId='me', body={'raw': raw}).execute()


if __name__ == '__main__':
    import sys
    import config as cfg
    if '--setup' in sys.argv:
        c = cfg.load()
        gmail_service(c['gmail_token_file'], c['gmail_credentials_file'])
        print('Gmail auth setup complete.')
