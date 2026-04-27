# fetch-server

FastAPI server that runs on a Raspberry Pi to fetch financial transaction emails from Gmail, parse them, and sync to Dropbox. Replaces a cron job with a persistent process that has a web UI and keeps a history of all fetched emails in SQLite.

## How it works

1. **Fetch** — Downloads unread spending alert emails from a Gmail label using the Gmail API. Emails are stored raw in SQLite and never re-downloaded.
2. **Parse** — Extracts transaction date, description, and amount from each email using regexes. Supports Chase, JPMorgan, and USAA email formats.
3. **Sync** — Merges new transactions into `transactions.json` on Dropbox, deduplicating by ID and description+date.

The web UI (Tailscale-only, port 8001) shows a log of recent runs, lets you trigger a fetch manually, re-parse all stored emails after a regex fix, and pull the latest code from GitHub.

A daily summary email is sent at 6am via the Gmail API listing any new transactions found in the past 24 hours.

## Setup

### 1. Python environment

```bash
cd fetch-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Config

Copy the example and fill in your values:

```bash
cp config.py config.json   # don't copy config.py itself — create config.json
```

`config.json` (gitignored):
```json
{
  "dropbox_access_token": "your-token-here",
  "summary_to": "you@example.com"
}
```

All other values default correctly. See `config.py` for the full list of keys.

### 3. Gmail OAuth

Place your `credentials.json` (from Google Cloud Console) in this directory, then run the one-time auth setup:

```bash
python pipeline.py --setup
```

On a headless Pi this prints a URL — visit it in any browser, authorize, and paste the redirect URL back into the terminal. This creates `token.json` which is refreshed automatically on subsequent runs.

**Note:** If you add new OAuth scopes (e.g. `gmail.send`), delete `token.json` and re-run `--setup`.

### 4. HTTPS (Tailscale)

```bash
sudo tailscale cert raspberrypi.your-tailnet.ts.net
sudo chown pi raspberrypi.your-tailnet.ts.net.key
```

Update `ExecStart` in `fetch-server.service` with the cert paths, then add a monthly renewal cron:

```
23 2 1 * * cd /home/pi/projects/spent/fetch-server && tailscale cert raspberrypi.your-tailnet.ts.net && chown pi raspberrypi.your-tailnet.ts.net.key && systemctl restart fetch-server
```

### 5. Systemd service

```bash
sudo cp fetch-server.service /etc/systemd/system/
sudo systemctl enable --now fetch-server
```

Allow the service to restart itself after a git pull:

```bash
echo 'pi ALL=(ALL) NOPASSWD: /bin/systemctl restart fetch-server' | sudo tee /etc/sudoers.d/fetch-server
sudo chmod 440 /etc/sudoers.d/fetch-server
```

## Files

| File | Purpose |
|------|---------|
| `server.py` | FastAPI app, APScheduler jobs, web UI routes |
| `pipeline.py` | Gmail fetch, email parsing, Dropbox sync |
| `db.py` | SQLite schema and helpers |
| `config.py` | Config loader with defaults |
| `templates/index.html` | Run list UI |
| `templates/run.html` | Per-run log and email detail |
| `fetch-server.service` | systemd unit file |

## Web UI

Access at `https://raspberrypi.your-tailnet.ts.net:8001`

- **Fetch Now** — run the pipeline immediately
- **Re-parse All Emails** — reset all stored emails to pending and re-run the parser (use after fixing a regex in `pipeline.py`)
- **Update (git pull)** — pull latest code from GitHub and restart the service
