import json
import os
import subprocess
import threading
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

import config as cfg
import db
import pipeline

# ── State ─────────────────────────────────────────────────────────────────────

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_run_lock = threading.Lock()   # prevent overlapping runs
_rerun = threading.Event()     # a run was requested while one was in progress
_scheduler = BackgroundScheduler()
_config = cfg.load()
db.init_db(_config['db_path'])

# SQLite connections must not be shared between threads that write
# concurrently (an extension POST committing in the middle of a pipeline run
# fails with "cannot commit - no transaction is active"). Each server thread
# (the main and LAN event loops) gets its own; each run opens a fresh one.
_local = threading.local()


def _db():
    if not hasattr(_local, 'conn'):
        _local.conn = db.get_conn(_config['db_path'])
    return _local.conn

# Last daily summary attempt: {'sent_at', 'subject', 'body'} or {'skipped_at', 'reason'}
_last_summary: dict | None = None

templates = Jinja2Templates(directory='templates')


def _git_info() -> dict:
    try:
        git_hash = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'], cwd=REPO_ROOT, text=True
        ).strip()
        git_date = subprocess.check_output(
            ['git', 'log', '-1', '--format=%ci'], cwd=REPO_ROOT, text=True
        ).strip()
        return {'hash': git_hash, 'date': git_date}
    except Exception:
        return {'hash': 'unknown', 'date': 'unknown'}


_git = _git_info()


# ── Scheduler ─────────────────────────────────────────────────────────────────

def _reschedule(interval_minutes: int):
    if _scheduler.get_job('fetch'):
        _scheduler.remove_job('fetch')
    _scheduler.add_job(_do_run, 'interval', minutes=interval_minutes, jitter=300, id='fetch')


def _send_daily_summary():
    global _last_summary
    conf = _config

    def _skip(reason: str):
        global _last_summary
        print(f'Daily summary skipped: {reason}')
        _last_summary = {'skipped_at': datetime.now(timezone.utc).isoformat(), 'reason': reason}

    if not conf.get('summary_to'):
        _skip('summary_to not configured')
        return

    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    runs = db.get_runs_since(_db(), since)
    if not runs:
        _skip('no successful runs with transactions in the past 24 hours')
        return

    transactions = []
    for run in runs:
        if run['added_transactions']:
            transactions.extend(json.loads(run['added_transactions']))

    count = len(transactions)
    if count == 0:
        _skip('runs found but added_transactions lists were all empty')
        return

    lines = [f'{count} new transaction{"s" if count != 1 else ""} in the past 24 hours:\n']
    for t in transactions:
        amount = t['amount_cents'] / 100
        lines.append(f'  {t["date"]}  {t["description"]:<40}  ${amount:>8.2f}')
    lines.append('\nhttps://spent-xi.vercel.app')

    body = '\n'.join(lines)
    subject = f'Spent: {count} new transaction{"s" if count != 1 else ""}'
    pipeline.send_email(conf, conf['summary_to'], subject, body)
    print(f'Daily summary sent to {conf["summary_to"]}: {count} transaction(s)')
    _last_summary = {
        'sent_at': datetime.now(timezone.utc).isoformat(),
        'subject': subject,
        'body': body,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    _reschedule(_config['fetch_interval_minutes'])
    _scheduler.add_job(_send_daily_summary, 'cron',
                       hour=_config['summary_hour'], minute=0, id='summary')
    _scheduler.start()
    lan_server = _start_lan_server(_config.get('lan_http_port'))
    yield
    if lan_server:
        lan_server.should_exit = True
    _scheduler.shutdown()


app = FastAPI(lifespan=lifespan)


# ── Pipeline runner ────────────────────────────────────────────────────────────

def _run_once():
    conn = db.get_conn(_config['db_path'])
    try:
        pipeline.run(conn, _config, print)
    except Exception:
        traceback.print_exc()  # Already logged to the run; keep the server going.
    finally:
        conn.close()


def _do_run():
    """Run the pipeline now; if a run is in progress, run again after it
    (e.g. so an order posted mid-run is matched without waiting an hour)."""
    while True:
        if not _run_lock.acquire(blocking=False):
            _rerun.set()
            return
        try:
            _rerun.clear()
            _run_once()
        finally:
            _run_lock.release()
        if not _rerun.is_set():
            return


# ── Routes ────────────────────────────────────────────────────────────────────

def _is_running() -> bool:
    acquired = _run_lock.acquire(blocking=False)
    if acquired:
        _run_lock.release()
    return not acquired


def _duration(run: dict) -> str:
    if not run.get('finished_at'):
        return '—'
    try:
        start = datetime.fromisoformat(run['started_at'])
        end = datetime.fromisoformat(run['finished_at'])
        secs = int((end - start).total_seconds())
        return f'{secs}s'
    except Exception:
        return '—'


@app.get('/', response_class=HTMLResponse)
async def index(request: Request):
    raw_runs = db.get_recent_runs(_db())
    runs = [dict(r) | {'duration': _duration(dict(r))} for r in raw_runs]
    job = _scheduler.get_job('fetch')
    next_run = job.next_run_time.strftime('%Y-%m-%d %H:%M UTC') if job and job.next_run_time else '—'
    amazon_orders = [
        dict(o) | {'items': json.loads(o['items'])}
        for o in db.get_recent_amazon_orders(_db())
    ]
    return templates.TemplateResponse(request, 'index.html', {
        'runs': runs,
        'amazon_orders': amazon_orders,
        'amazon_debug_pages': [dict(p) for p in db.list_amazon_debug_pages(_db())],
        'next_run': next_run,
        'running': _is_running(),
        'git': _git,
        'last_summary': _last_summary,
    })


@app.get('/run/{run_id}', response_class=HTMLResponse)
async def run_detail(request: Request, run_id: int):
    run = db.get_run(_db(), run_id)
    emails = db.get_run_emails(_db(), run_id)
    return templates.TemplateResponse(request, 'run.html', {
        'run': dict(run),
        'emails': [dict(e) for e in emails],
    })


@app.get('/ping')
async def ping():
    return 'pong'


@app.post('/fetch')
async def fetch_now():
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse('/', status_code=303)


@app.post('/reparse')
async def reparse():
    count = db.reset_parsed_emails(_db())
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse(f'/?reparsing={count}', status_code=303)


@app.post('/reparse/{run_id}')
async def reparse_run(run_id: int):
    count = db.reset_parsed_emails_for_run(_db(), run_id)
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse(f'/run/{run_id}?reparsing={count}', status_code=303)


ISO_DATE = r'^\d{4}-\d{2}-\d{2}$'


class AmazonCharge(BaseModel):
    date: str = Field(pattern=ISO_DATE)
    amount_cents: int
    payment: str | None = None  # e.g. "Prime Visa ****1234"


class AmazonOrder(BaseModel):
    order_id: str = Field(min_length=1, max_length=64)
    order_date: str = Field(pattern=ISO_DATE)
    total_cents: int
    items: list[str] = Field(min_length=1)
    charges: list[AmazonCharge] = []
    url: str | None = Field(default=None, pattern=r'^https://')


@app.post('/amazon/orders')
async def post_amazon_order(order: AmazonOrder):
    """Called by the browser extension when an order-details page is viewed.
    (It skips in-store Whole Foods purchases, which also appear there.)"""
    status = db.upsert_amazon_order(
        _db(), order.order_id, order.order_date, order.total_cents,
        order.items, [c.model_dump() for c in order.charges], order.url,
    )
    if status == 'pending':
        # Try to match right away instead of waiting for the next scheduled run.
        threading.Thread(target=_do_run, daemon=True).start()
    return {'status': status}


MAX_HTML_CHARS = 10_000_000


class AmazonDebugPage(BaseModel):
    page_key: str = Field(min_length=1, max_length=256)
    reason: str = Field(max_length=1000)
    url: str | None = None
    order_html: str | None = Field(default=None, max_length=MAX_HTML_CHARS)
    transactions_html: str | None = Field(default=None, max_length=MAX_HTML_CHARS)
    scraped: dict | None = None


@app.post('/amazon/debug')
async def post_amazon_debug(page: AmazonDebugPage):
    """Called by the extension with pages it couldn't scrape, or whose charges
    looked unusual, so the scraper can be fixed from the real HTML."""
    page_id = db.save_amazon_debug_page(
        _db(), page.page_key, page.reason, page.url,
        page.order_html, page.transactions_html, page.scraped,
    )
    return {'id': page_id}


@app.get('/amazon/debug')
async def list_amazon_debug():
    """Saved debug pages (JSON, no HTML). Fetch the HTML from
    /amazon/debug/{id}/order.html or /amazon/debug/{id}/transactions.html."""
    return [
        dict(p) | {'scraped': json.loads(p['scraped']) if p['scraped'] else None}
        for p in db.list_amazon_debug_pages(_db())
    ]


@app.get('/amazon/debug/{page_id}/{which}.html')
async def get_amazon_debug_html(page_id: int, which: str):
    page = db.get_amazon_debug_page(_db(), page_id)
    column = {'order': 'order_html', 'transactions': 'transactions_html'}.get(which)
    if page is None or column is None or page[column] is None:
        raise HTTPException(404)
    # Served as plain text: rendering Amazon's HTML (and running its scripts)
    # on this origin would be pointless and unsafe.
    return PlainTextResponse(page[column])


@app.post('/amazon/debug/{page_id}/delete')
async def delete_amazon_debug(page_id: int):
    db.delete_amazon_debug_page(_db(), page_id)
    return RedirectResponse('/#amazon-debug', status_code=303)


# ── Plain-HTTP LAN server for the extension ───────────────────────────────────
# The main server is HTTPS with a Tailscale certificate, so browsers without
# Tailscale can't use it. With lan_http_port set in config.json, the
# extension's endpoints (only) are also served over plain HTTP on that port,
# e.g. http://pi.home:8002, from a second server in this process (sharing the
# DB connection and run lock).

lan_app = FastAPI()
lan_app.add_api_route('/ping', ping, methods=['GET'])
lan_app.add_api_route('/amazon/orders', post_amazon_order, methods=['POST'])
lan_app.add_api_route('/amazon/debug', post_amazon_debug, methods=['POST'])


def _start_lan_server(port):
    if not port:
        return None
    import uvicorn
    server = uvicorn.Server(uvicorn.Config(lan_app, host='0.0.0.0', port=int(port)))
    # uvicorn leaves signal handling to the main server when run off the main thread.
    threading.Thread(target=server.run, daemon=True, name='lan-http').start()
    return server


def _restarting_html(git_hash: str, changed: bool) -> str:
    if changed:
        subtitle = f'Pulled new code &mdash; <code>{git_hash}</code>'
    else:
        subtitle = f'Already up to date &mdash; <code>{git_hash}</code> (restarting anyway)'
    return f"""<!doctype html>
<html><head><title>Restarting...</title>
<style>body{{font-family:system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem}}</style>
</head><body>
<h1>Restarting...</h1>
<p>{subtitle}</p>
<p id="msg">Waiting for server to come back up.</p>
<script>
async function poll() {{
  try {{
    const r = await fetch('/ping');
    if (r.ok) {{ window.location = '/'; return; }}
  }} catch(e) {{}}
  document.getElementById('msg').textContent += '.';
  setTimeout(poll, 1000);
}}
setTimeout(poll, 2000);
</script>
</body></html>"""


@app.post('/update')
async def update():
    result = subprocess.run(
        ['git', 'pull'], cwd=REPO_ROOT, capture_output=True, text=True,
    )
    if result.returncode == 0:
        changed = 'Already up to date' not in result.stdout
        git_hash = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'], cwd=REPO_ROOT, text=True
        ).strip()
        subprocess.Popen(['sudo', 'systemctl', 'restart', 'fetch-server'])
        return HTMLResponse(_restarting_html(git_hash, changed))
    return RedirectResponse('/?update=fail', status_code=303)
