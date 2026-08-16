"""Settings screen: persist Jira, Ollama, and Groq configuration."""
import streamlit as st

from config_store import load_settings, save_settings
from ui_theme import inject_global_styles, render_card_header, render_hero, render_sidebar_help, render_status_badges

st.set_page_config(page_title="Settings", page_icon="⚙️")
inject_global_styles()
render_sidebar_help("settings")
render_hero("Settings", "Manage Jira and model provider configuration for test case generation.")

settings = load_settings()

jira_ready = bool(settings.get("jira_url") and settings.get("jira_email") and settings.get("jira_token"))
groq_ready = bool(settings.get("groq_token"))
render_status_badges(
    [
        ("Jira ready" if jira_ready else "Jira info missing", "ok" if jira_ready else "warn"),
        ("Groq token set" if groq_ready else "Groq token missing", "ok" if groq_ready else "warn"),
    ]
)

render_card_header("Jira Configuration", "Required to fetch summary, description, and acceptance criteria.")
jira_col1, jira_col2 = st.columns(2)
with jira_col1:
    jira_email = st.text_input("JIRA EMAIL", value=settings.get("jira_email", ""), placeholder="you@company.com")
    jira_url = st.text_input("JIRA URL", value=settings.get("jira_url", ""), placeholder="https://yourcompany.atlassian.net")
with jira_col2:
    jira_token = st.text_input("JIRA TOKEN", value=settings.get("jira_token", ""), type="password")
    st.caption("Use an Atlassian API token. Value stays hidden.")

render_card_header("Model Provider", "Choose local-first or cloud fallback generation mode.")
provider = st.radio(
    "LLM Provider",
    options=["ollama", "groq"],
    index=0 if settings.get("provider", "ollama") == "ollama" else 1,
    format_func=lambda p: "Ollama (local, default)" if p == "ollama" else "Groq (fallback)",
    horizontal=True,
)

render_card_header("Endpoints and Access", "Configure model endpoint and fallback token.")
ep_col1, ep_col2 = st.columns(2)
with ep_col1:
    ollama_url = st.text_input(
        "OLLAMA URL",
        value=settings.get("ollama_url", "http://localhost:11434"),
        placeholder="http://localhost:11434",
    )
with ep_col2:
    groq_token = st.text_input("GROQ Token", value=settings.get("groq_token", ""), type="password")
    st.caption("Optional when Ollama is primary. Required if provider is Groq.")

if st.button("Save settings"):
    save_settings(
        {
            "jira_email": jira_email,
            "jira_token": jira_token,
            "jira_url": jira_url,
            "ollama_url": ollama_url,
            "groq_token": groq_token,
            "provider": provider,
        }
    )
    st.success("Settings saved.")
