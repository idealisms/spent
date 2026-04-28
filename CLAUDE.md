# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Development Workflow

- Always make changes on a feature branch, never directly on `main`.
- Push the branch when done, but **do not merge to `main`** — wait for the user to review and approve the PR.
- If a PR doesn't exist yet for the branch, create one so the user can review it (unless they explicitly say otherwise).

## Repository Structure

This is a personal finance tracker with two independent parts that share Dropbox as a data layer.

```
spent/
├── fetch-server/    # Raspberry Pi daemon: fetches emails → parses → syncs to Dropbox
└── tracker/         # React SPA: reads/writes transactions.json on Dropbox
```

**Data flow:** Gmail → `fetch-server` → `transactions.json` on Dropbox ← `tracker` (browser)

## fetch-server

FastAPI server running on a Raspberry Pi, accessible only via Tailscale.

**Stack:** Python, FastAPI, APScheduler, SQLite, Jinja2, Gmail API, Dropbox SDK

**Key files:**
- `pipeline.py` — Gmail fetch, email parsing regexes, Dropbox sync logic
- `db.py` — SQLite schema (`fetch_runs`, `emails` tables) and all DB helpers
- `server.py` — FastAPI routes, APScheduler setup, daily email summary
- `config.py` — loads `config.json` (gitignored) with fallback defaults

**Running locally (Pi only):**
```bash
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Re-parse flow:** When email parsing regexes are fixed, call `db.reset_parsed_emails()` then trigger a run — all stored emails are re-parsed from SQLite without hitting Gmail again.

**Gitignored on Pi:** `config.json`, `token.json`, `credentials.json`, `fetch_server.db`

## tracker

React SPA deployed on Vercel. All data access is browser-to-Dropbox directly — no server involved.

**Stack:** React 18, Redux 5, TypeScript 5, MUI 7, Dropbox API, Webpack

**Commands** (run from `tracker/`):
```bash
yarn start        # Dev server on port 8080
yarn build        # Production build → build/
yarn test
yarn prettier
```

**Key files:**
- `app/transactions/` — transaction model, actions, components
- `app/auth/` — Dropbox OAuth token management
- `app/main/` — Daily/Monthly views, Reports, Editor
- `app/config.ts` — Dropbox app key and path constants (gitignored, copy from `config.ts.example`)

See `tracker/CLAUDE.md` for full tracker architecture details.

## Transaction data model

`transactions.json` on Dropbox is the source of truth — a JSON array of transaction objects:

```json
{
  "id": "gmail-message-id or uuid",
  "description": "TRADER JOE'S",
  "date": "2026-04-27",
  "amount_cents": 4523,
  "tags": ["groceries"],
  "notes": "",
  "source": "email_chase",
  "original_line": "email subject or csv row",
  "transactions": []   // sub-transactions for splits
}
```

`amount_cents` is positive for spending, negative for deposits/credits. `transactions` holds split sub-transactions when a transaction is manually divided.
