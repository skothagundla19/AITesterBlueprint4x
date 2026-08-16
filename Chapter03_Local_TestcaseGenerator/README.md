# Chapter 03 — Local Test Case Generator

A two-screen Streamlit app that turns a Jira ticket into a draft test case set, using a local Ollama model by default and Groq as an automatic fallback.

## Latest Update (UI Refresh)

- Added a shared visual theme with reusable UI helpers in `src/ui_theme.py`.
- Refreshed Chat and Settings screens with a consistent hero header, card sections, and sidebar quick help.
- Added status badges for provider and configuration readiness.
- Improved visual hierarchy, spacing, and mobile-friendly behavior.
- Kept all Jira/LLM/export logic unchanged.

## Screens

- **Chat** (`src/app.py`) — type a request like `create tc for VWO-49` and click Send. The app:
  1. Extracts the Jira key from the message.
  2. Fetches the ticket's summary/description/acceptance criteria via the Jira REST API.
  3. Fills the test case template (`Templates/TestcaseCreator.md`) with the ticket content.
  4. Sends the merged prompt to Ollama (model `gemma3:1b`) — or Groq if Ollama is unavailable or explicitly selected.
  5. Renders the generated test cases in the chat pane, with a **Download as Excel** button when the reply contains a table.
- **Settings** (`src/pages/1_Settings.py`) — enter and persist Jira URL/email/API token, Ollama URL, Groq API token, and provider choice.

### UI Highlights

- Shared app styling via `inject_global_styles()` in `src/ui_theme.py`.
- Reusable hero and status components for both screens.
- Grouped settings fields into clear sections:
  - Jira Configuration
  - Model Provider
  - Endpoints and Access
- Improved chat presentation with styled message shell and stronger action button treatment.

## Setup

```bash
cd Chapter03_Local_TestcaseGenerator
pip install -r requirements.txt
```

Configuration can come from either source (settings saved via the UI take precedence over `.env`):

- **Settings screen**: fill in the form and click "save settings" — writes to `src/config/settings.json` (gitignored).
- **`.env` file**: copy `src/.env.example` to `src/.env` and fill in the values — loaded automatically on startup (gitignored).

```
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=you@yourcompany.com
JIRA_TOKEN=
OLLAMA_URL=http://localhost:11434
GROQ_TOKEN=
LLM_PROVIDER=ollama
```

## Run

```bash
streamlit run src/app.py
```

- Chat: `http://localhost:8501/`
- Settings: `http://localhost:8501/Settings`

Ollama must already be running locally with `gemma3:1b` pulled. Groq is only called when Ollama is unreachable or `LLM_PROVIDER=groq` (or the Settings-page provider radio) is set to Groq.

## Files

```
Chapter03_Local_TestcaseGenerator/
├── requirements.txt
├── Templates/
│   └── TestcaseCreator.md      # test case template (filled per-ticket)
└── src/
    ├── app.py                  # Chat screen
    ├── ui_theme.py             # shared UI theme + helper components
    ├── pages/1_Settings.py     # Settings screen
    ├── config_store.py         # settings.json + .env loader
    ├── jira_client.py          # Jira REST API client
    ├── llm_client.py           # Ollama call + Groq fallback
    ├── export_utils.py         # markdown table -> Excel (.xlsx) export
    └── .env.example            # template for local .env
```

No credentials are hardcoded anywhere in source — `src/config/settings.json` and `src/.env` are both gitignored.
