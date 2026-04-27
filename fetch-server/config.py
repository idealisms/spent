"""Load and save server config from config.json (gitignored)."""
import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

DEFAULTS = {
    'dropbox_access_token': '',
    'dropbox_path': '/spent tracker/transactions.json',
    'gmail_label_id': 'Label_6978996750297338417',
    'gmail_token_file': 'token.json',
    'gmail_credentials_file': 'credentials.json',
    'db_path': 'fetch_server.db',
    'fetch_interval_minutes': 60,
}


def load() -> dict:
    if not os.path.exists(CONFIG_PATH):
        return dict(DEFAULTS)
    with open(CONFIG_PATH) as f:
        stored = json.load(f)
    return {**DEFAULTS, **stored}


def save(config: dict) -> None:
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)
