import json
import os
import subprocess
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import config as cfg
import db
import pipeline

# ── State ─────────────────────────────────────────────────────────────────────

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_run_lock = threading.Lock()   # prevent overlapping runs
_scheduler = BackgroundScheduler()
_config = cfg.load()
_conn = db.get_conn(_config['db_path'])
db.init_db(_config['db_path'])

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
    cfg = _config
    if not cfg.get('summary_to') or not cfg.get('smtp_user'):
        return

    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    runs = db.get_runs_since(_conn, since)
    if not runs:
        return

    transactions = []
    for run in runs:
        if run['added_transactions']:
            transactions.extend(json.loads(run['added_transactions']))

    count = len(transactions)
    if count == 0:
        return

    lines = [f'{count} new transaction{"s" if count != 1 else ""} in the past 24 hours:\n']
    for t in transactions:
        amount = t['amount_cents'] / 100
        lines.append(f'  {t["date"]}  {t["description"]:<40}  ${amount:>8.2f}')

    body = '\n'.join(lines)
    subject = f'Spent: {count} new transaction{"s" if count != 1 else ""}'
    pipeline.send_email(cfg, cfg['summary_to'], subject, body)
    print(f'Daily summary sent: {count} transaction(s)')


@asynccontextmanager
async def lifespan(app: FastAPI):
    _reschedule(_config['fetch_interval_minutes'])
    _scheduler.add_job(_send_daily_summary, 'cron',
                       hour=_config['summary_hour'], minute=0, id='summary')
    _scheduler.start()
    yield
    _scheduler.shutdown()


app = FastAPI(lifespan=lifespan)


# ── Pipeline runner ────────────────────────────────────────────────────────────

def _do_run():
    if not _run_lock.acquire(blocking=False):
        return  # already running
    try:
        pipeline.run(_conn, _config, print)
    finally:
        _run_lock.release()


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
    raw_runs = db.get_recent_runs(_conn)
    runs = [dict(r) | {'duration': _duration(dict(r))} for r in raw_runs]
    job = _scheduler.get_job('fetch')
    next_run = job.next_run_time.strftime('%Y-%m-%d %H:%M UTC') if job and job.next_run_time else '—'
    return templates.TemplateResponse(request, 'index.html', {
        'runs': runs,
        'next_run': next_run,
        'running': _is_running(),
        'git': _git,
    })


@app.get('/run/{run_id}', response_class=HTMLResponse)
async def run_detail(request: Request, run_id: int):
    run = db.get_run(_conn, run_id)
    emails = db.get_run_emails(_conn, run_id)
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
    count = db.reset_parsed_emails(_conn)
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse(f'/?reparsing={count}', status_code=303)


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
