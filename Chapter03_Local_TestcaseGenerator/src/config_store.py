"""Read/write persisted app settings (Jira + LLM config).

Precedence, lowest to highest: DEFAULT_SETTINGS < .env file < settings.json
(settings.json is written whenever the user clicks "save settings").
"""
import json
import os

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
CONFIG_PATH = os.path.join(CONFIG_DIR, "settings.json")

load_dotenv(os.path.join(BASE_DIR, ".env"))

DEFAULT_SETTINGS = {
    "jira_url": "",
    "jira_email": "",
    "jira_token": "",
    "ollama_url": "http://localhost:11434",
    "groq_token": "",
    "provider": "ollama",  # "ollama" or "groq"
}

ENV_KEYS = {
    "jira_url": "JIRA_URL",
    "jira_email": "JIRA_EMAIL",
    "jira_token": "JIRA_TOKEN",
    "ollama_url": "OLLAMA_URL",
    "groq_token": "GROQ_TOKEN",
    "provider": "LLM_PROVIDER",
}


def _env_settings() -> dict:
    return {key: os.environ[env_key] for key, env_key in ENV_KEYS.items() if os.environ.get(env_key)}


def load_settings() -> dict:
    settings = dict(DEFAULT_SETTINGS)
    settings.update(_env_settings())
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            settings.update(json.load(f))
    return settings


def save_settings(settings: dict) -> None:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)
