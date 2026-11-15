"""Match Amazon orders (scraped by the browser extension) to card transactions.

Amazon charges the card when items ship, so an order may not have a matching
transaction until days after it was placed. Orders are stored in SQLite and
every pipeline run retries the unmatched ones against transactions.json.

When an order matches, the matched transactions get a short Claude-written
description of what was bought in their `notes` (existing notes are never
overwritten). The bank's `description` is left alone.
"""
import json
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import date
from typing import Callable, Optional

import anthropic

import db

Log = Callable[[str], None]

AMAZON_DESCRIPTION = re.compile(r'amazon|amzn', re.IGNORECASE)
# Prime membership fees look like Amazon charges but never belong to an order.
NOT_AN_ORDER = re.compile(r'prime pmts|prime membership', re.IGNORECASE)

# Bank transaction amounts must match to within this many cents.
AMOUNT_TOLERANCE_CENTS = 1

# With individual card charges from Amazon's transactions page, the bank
# transaction can be dated anywhere from the order date (card alerts fire on
# authorization, often days before Amazon shows the charge as completed) to a
# few days after the charge date (posting lag). One day of slack before the
# order for timezone differences.
CHARGE_DAYS_BEFORE_ORDER = 1
CHARGE_DAYS_AFTER_CHARGE = 5

# Without per-charge info, charges land 0-7 days after the order date (when
# items ship); split shipments get two charges within 14 days.
ORDER_WINDOW_DAYS = (0, 7)
SPLIT_WINDOW_DAYS = (0, 14)

DEFAULT_MODEL = 'claude-haiku-5-5'
NOTE_MAX_CHARS = 80


@dataclass
class MatchResult:
    """What apply_matches() changed, to be committed to SQLite only after the
    edited transactions.json has been uploaded."""
    matched: dict = field(default_factory=dict)  # order_id -> [txn ids]
    notes_written: int = 0


# ── Matching ──────────────────────────────────────────────────────────────────

def _days(from_date: str, to_date: str) -> int:
    return (date.fromisoformat(to_date) - date.fromisoformat(from_date)).days


def _in_window(from_date: str, to_date: str, window: tuple) -> bool:
    return window[0] <= _days(from_date, to_date) <= window[1]


def _amount_matches(txn: dict, amount_cents: int) -> bool:
    return abs(txn['amount_cents'] - amount_cents) <= AMOUNT_TOLERANCE_CENTS


def is_candidate(txn: dict) -> bool:
    """Could this transaction be a charge for an Amazon order?"""
    return (
        txn.get('amount_cents', 0) > 0
        and 'deleted' not in txn.get('tags', [])
        and AMAZON_DESCRIPTION.search(txn.get('description', '')) is not None
        and NOT_AN_ORDER.search(txn.get('description', '')) is None
    )


def match_order(order: dict, candidates: list) -> Optional[list]:
    """Return the transactions that pay for `order`, or None if not (yet) found.

    order: {'order_date', 'total_cents', 'charges': [{'date', 'amount_cents'}]}
    candidates: Amazon-looking transactions not claimed by another order.
    """
    charges = order.get('charges') or []
    if charges:
        # Every charge listed on the page must be matched.
        used = set()
        found = []
        for charge in charges:
            options = [
                t for t in candidates
                if t['id'] not in used
                and _amount_matches(t, charge['amount_cents'])
                and _days(order['order_date'], t['date']) >= -CHARGE_DAYS_BEFORE_ORDER
                and _days(charge['date'], t['date']) <= CHARGE_DAYS_AFTER_CHARGE
            ]
            if not options:
                return None
            best = min(options, key=lambda t: abs(_days(charge['date'], t['date'])))
            used.add(best['id'])
            found.append(best)
        return found

    order_date = order['order_date']
    total = order['total_cents']
    near = [t for t in candidates if _in_window(order_date, t['date'], ORDER_WINDOW_DAYS)]
    singles = [t for t in near if _amount_matches(t, total)]
    if singles:
        return [min(singles, key=lambda t: _days(order_date, t['date']))]

    wide = [t for t in candidates if _in_window(order_date, t['date'], SPLIT_WINDOW_DAYS)]
    for i, a in enumerate(wide):
        for b in wide[i + 1:]:
            if abs(a['amount_cents'] + b['amount_cents'] - total) <= AMOUNT_TOLERANCE_CENTS:
                return [a, b]
    return None


# ── Summaries ─────────────────────────────────────────────────────────────────

SUMMARY_PROMPT = """\
Write a short description of this Amazon order for a personal spending ledger.
Say what was bought in 2-6 plain words, the way a person would jot it down \
(for example "Kids rain boots" or "Printer ink, paper towels"). Drop brand \
names, sizes and marketing words unless they are needed to tell what the item \
is. If there are several unrelated items, name the main two or three.

Reply with only the description.

Items:
{items}"""


def truncated_summary(items: list) -> str:
    """Fallback when no Anthropic API key is configured."""
    first = items[0] if items else 'Amazon order'
    if len(items) > 1:
        first = f'{first} (+{len(items) - 1} more)'
    return first if len(first) <= NOTE_MAX_CHARS else first[:NOTE_MAX_CHARS - 3] + '...'


def summarize_items(items: list, api_key: str, model: str = DEFAULT_MODEL) -> str:
    """Ask Claude for a short description of the items. Raises on API errors
    or refusals so the caller can retry on a later run."""
    client = anthropic.Anthropic(api_key=api_key, timeout=60.0)
    response = client.messages.create(
        model=model,
        max_tokens=2000,
        output_config={'effort': 'low'},
        messages=[{
            'role': 'user',
            'content': SUMMARY_PROMPT.format(items='\n'.join(f'- {i}' for i in items)),
        }],
    )
    if response.stop_reason == 'refusal':
        raise RuntimeError('Claude declined to summarize the order')
    text = ''.join(b.text for b in response.content if b.type == 'text').strip()
    if not text:
        raise RuntimeError(f'Empty summary (stop_reason={response.stop_reason})')
    text = text.strip('"').splitlines()[0].strip()
    return text[:NOTE_MAX_CHARS]


def _summary_for(conn: sqlite3.Connection, order: sqlite3.Row, config: dict, log: Log) -> Optional[str]:
    """The order's cached summary, generating (and caching) it if needed.
    Returns None if Claude couldn't be reached; the order is retried next run."""
    if order['summary']:
        return order['summary']
    items = json.loads(order['items'])
    api_key = config.get('anthropic_api_key')
    if not api_key:
        return truncated_summary(items)
    try:
        summary = summarize_items(items, api_key, config.get('anthropic_model') or DEFAULT_MODEL)
    except (anthropic.APIError, RuntimeError) as e:
        log(f'Amazon order {order["order_id"]}: summary failed, will retry: {e}')
        return None
    db.set_amazon_summary(conn, order['order_id'], summary)
    return summary


# ── Applying matches to transactions.json ─────────────────────────────────────

def apply_matches(existing: list, conn: sqlite3.Connection, config: dict, log: Log) -> MatchResult:
    """Match pending orders against `existing` (the transactions.json list) and
    write summaries into the matched transactions' notes, in place.

    Doesn't mark orders matched in SQLite; call commit() once the edited list
    has been uploaded. Safe to call again on a fresh download after an upload
    conflict: summaries are cached, so Claude is only asked once per order."""
    result = MatchResult()
    pending = db.get_amazon_orders(conn, 'pending')
    if not pending:
        return result

    claimed = set()
    for row in db.get_amazon_orders(conn, 'matched'):
        claimed.update(json.loads(row['matched_txn_ids']))
    candidates = [t for t in existing if is_candidate(t) and t['id'] not in claimed]

    for row in pending:
        order = {
            'order_date': row['order_date'],
            'total_cents': row['total_cents'],
            'charges': json.loads(row['charges']),
        }
        if order['total_cents'] <= 0 and not order['charges']:
            continue  # Paid entirely with gift card / points: no card charge.
        txns = match_order(order, candidates)
        if txns is None:
            continue
        summary = _summary_for(conn, row, config, log)
        if summary is None:
            continue
        ids = [t['id'] for t in txns]
        for t in txns:
            if not (t.get('notes') or '').strip():
                t['notes'] = summary
                result.notes_written += 1
        result.matched[row['order_id']] = ids
        candidates = [t for t in candidates if t['id'] not in ids]
        log(f'Amazon order {row["order_id"]} -> {", ".join(t["description"] + " " + t["date"] for t in txns)}: {summary}')

    log(f'Matched {len(result.matched)}/{len(pending)} pending Amazon order(s)')
    return result


def commit(conn: sqlite3.Connection, result: MatchResult) -> None:
    for order_id, ids in result.matched.items():
        db.mark_amazon_order_matched(conn, order_id, ids)
