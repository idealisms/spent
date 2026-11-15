# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Development Workflow

- Always make changes on a feature branch, never directly on `main`.
- When work is complete, push the branch and create a PR if one doesn't exist.
- **Do not merge to `main` manually** — after creating the PR, wait for CI checks to pass, then merge via the PR.

## Repository Structure

This is a personal finance tracker with two independent parts that share Dropbox as a data layer, plus a browser extension that feeds the fetch-server.

```
spent/
├── fetch-server/      # Raspberry Pi daemon: fetches emails → parses → syncs to Dropbox
├── tracker/           # React SPA: reads/writes transactions.json on Dropbox
└── amazon-extension/  # Chrome extension: posts Amazon order details to fetch-server
```

**Data flow:** Gmail → `fetch-server` → `transactions.json` on Dropbox ← `tracker` (browser)

Amazon order pages → `amazon-extension` → `fetch-server` (matches orders to Amazon card transactions and writes a Claude-generated summary into their `notes`)

## fetch-server

FastAPI server running on a Raspberry Pi, accessible only via Tailscale.

**Stack:** Python, FastAPI, APScheduler, SQLite, Jinja2, Gmail API, Dropbox SDK

**Key files:**
- `pipeline.py` — Gmail fetch, email parsing regexes, Dropbox sync logic
- `db.py` — SQLite schema (`fetch_runs`, `emails`, `amazon_orders` tables) and all DB helpers
- `server.py` — FastAPI routes, APScheduler setup, daily email summary
- `amazon.py` — matches Amazon orders (from the extension) to transactions; Claude summaries
- `config.py` — loads `config.json` (gitignored) with fallback defaults

**Reaching it:** `https://raspberrypi.<tailnet>.ts.net:8001` (HTTPS with a Tailscale cert, so `http://` and the LAN name `pi.home` don't work). If `lan_http_port` is set in `config.json` (e.g. 8002), the extension's two POST endpoints (and `/ping`) are also served over plain HTTP at `http://pi.home:8002`, for home computers without Tailscale; nothing else is exposed there.

**Running locally (Pi only):**
```bash
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Re-parse flow:** When email parsing regexes are fixed, call `db.reset_parsed_emails()` then trigger a run — all stored emails are re-parsed from SQLite without hitting Gmail again.

**Gitignored on Pi:** `config.json`, `token.json`, `credentials.json`, `fetch_server.db`

**Amazon orders:** `POST /amazon/orders` stores orders in the `amazon_orders` table; `POST /amazon/debug` stores pages the extension couldn't scrape (`amazon_debug_pages`). Every run retries unmatched orders (charges post when items ship), writing the summary into matched transactions' `notes` only if empty. The Anthropic API key comes from the tracker's `settings.json` on Dropbox (`anthropicApiKey`), falling back to `anthropic_api_key` in `config.json`; without either, the first item title is used.

## amazon-extension

Manifest V3 Chrome extension, no build step. `scrape.js` reads the order-details page via its `data-component` attributes, and the card charges from the order's "related transactions" page (`/cpe/yourpayments/transactions?transactionTag=<order id>`). In-store Whole Foods purchases (a different page template) are skipped. Tests: `npm test` (Vitest + jsdom) from `amazon-extension/`. Never commit saved Amazon pages (personal data); fixtures are hand-written to mirror the real markup.

**Fixing the scraper:** pages the extension couldn't read, or whose charges looked unusual (none found, or not adding up to the order total), are saved on the fetch-server. List them with `curl https://raspberrypi.<tailnet>.ts.net:8001/amazon/debug` (reason + what was scraped) and download the HTML from `/amazon/debug/<id>/order.html` and `/amazon/debug/<id>/transactions.html`. Update `scrape.js` and add a scrubbed fixture to `test/fixtures.js` for the new case.

## tracker

React SPA deployed on Vercel. All data access is browser-to-Dropbox directly — no server involved.

**Stack:** React 19, Redux 5, TypeScript 7, MUI 9, Dropbox API, Webpack, Vitest

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
