import subprocess
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import config as cfg
import db
import pipeline

# ── State ─────────────────────────────────────────────────────────────────────

_run_lock = threading.Lock()   # prevent overlapping runs
_scheduler = BackgroundScheduler()
_config = cfg.load()
_conn = db.get_conn(_config['db_path'])
db.init_db(_config['db_path'])

templates = Jinja2Templates(directory='templates')


# ── Scheduler ─────────────────────────────────────────────────────────────────

def _scheduled_run():
    _do_run()


def _reschedule(interval_minutes: int):
    if _scheduler.get_job('fetch'):
        _scheduler.remove_job('fetch')
    _scheduler.add_job(_scheduled_run, 'interval',
                       minutes=interval_minutes, id='fetch')


@asynccontextmanager
async def lifespan(app: FastAPI):
    _reschedule(_config['fetch_interval_minutes'])
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
    return templates.TemplateResponse('index.html', {
        'request': request,
        'runs': runs,
        'next_run': next_run,
        'running': _is_running(),
    })


@app.get('/run/{run_id}', response_class=HTMLResponse)
async def run_detail(request: Request, run_id: int):
    run = db.get_run(_conn, run_id)
    emails = db.get_run_emails(_conn, run_id)
    return templates.TemplateResponse('run.html', {
        'request': request,
        'run': dict(run),
        'emails': [dict(e) for e in emails],
    })


@app.post('/fetch')
async def fetch_now():
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse('/', status_code=303)


@app.post('/reparse')
async def reparse():
    """Reset all parsed emails to pending and trigger a run."""
    count = db.reset_parsed_emails(_conn)
    threading.Thread(target=_do_run, daemon=True).start()
    return RedirectResponse(f'/?reparsing={count}', status_code=303)


@app.post('/update')
async def update():
    """git pull and restart the service."""
    result = subprocess.run(
        ['git', 'pull'],
        cwd='/home/pi/source/spent',
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        subprocess.Popen(['sudo', 'systemctl', 'restart', 'fetch-server'])
    return RedirectResponse(f'/?update={result.returncode}', status_code=303)
