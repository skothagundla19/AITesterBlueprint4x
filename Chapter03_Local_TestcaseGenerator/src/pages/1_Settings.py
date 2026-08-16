"""Settings screen: persist Jira, Ollama, and Groq configuration."""
import streamlit as st

from config_store import load_settings, save_settings

st.set_page_config(page_title="Settings", page_icon="⚙️")
st.title("Settings")

settings = load_settings()

jira_email = st.text_input("JIRA EMAIL", value=settings.get("jira_email", ""))
jira_token = st.text_input("JIRA TOKEN", value=settings.get("jira_token", ""), type="password")
jira_url = st.text_input("JIRA URL", value=settings.get("jira_url", ""))
ollama_url = st.text_input("OLLAMA URL", value=settings.get("ollama_url", "http://localhost:11434"))
groq_token = st.text_input("GROQ Token", value=settings.get("groq_token", ""), type="password")
provider = st.radio(
    "LLM Provider",
    options=["ollama", "groq"],
    index=0 if settings.get("provider", "ollama") == "ollama" else 1,
    format_func=lambda p: "Ollama (local, default)" if p == "ollama" else "Groq (fallback)",
    horizontal=True,
)

if st.button("save settings"):
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
