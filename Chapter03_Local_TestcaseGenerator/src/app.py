"""Chat screen: type 'create tc for <JIRA-KEY>' to generate test cases."""
import os
import re

import streamlit as st

from config_store import load_settings
from export_utils import dataframe_to_excel_bytes, parse_markdown_table
from jira_client import JiraClientError, get_ticket
from llm_client import LLMClientError, generate_test_cases
from ui_theme import inject_global_styles, render_hero, render_sidebar_help, render_status_badges

TEMPLATE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Templates", "TestcaseCreator.md"
)
JIRA_KEY_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9]*-\d+")

st.set_page_config(page_title="Jira Test Case Generator", page_icon="💬")
inject_global_styles()
render_sidebar_help("chat")
render_hero(
    "Jira Test Case Generator",
    "Turn Jira tickets into draft test cases with local-first generation and quick Excel export.",
)

settings = load_settings()
provider = settings.get("provider", "ollama")
has_jira_config = bool(settings.get("jira_url") and settings.get("jira_email") and settings.get("jira_token"))
render_status_badges(
    [
        ("Provider: Ollama" if provider == "ollama" else "Provider: Groq", "ok"),
        ("Jira configured" if has_jira_config else "Jira setup incomplete", "ok" if has_jira_config else "warn"),
    ]
)
st.caption('Tip: Use a prompt like "KAN-6"')

if "messages" not in st.session_state:
    st.session_state.messages = []


def load_template() -> str:
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        return f.read()


def handle_request(user_message: str) -> str:
    match = JIRA_KEY_PATTERN.search(user_message.upper())
    if not match:
        return "I couldn't find a Jira ticket key (e.g. VWO-49) in your message. Please include one."

    key = match.group(0)
    settings = load_settings()

    try:
        ticket = get_ticket(key, settings)
    except JiraClientError as exc:
        return f"⚠️ {exc}"

    template = load_template()

    try:
        return generate_test_cases(ticket, template, settings)
    except LLMClientError as exc:
        return f"⚠️ {exc}"


st.markdown('<div class="chat-shell">', unsafe_allow_html=True)
for i, message in enumerate(st.session_state.messages):
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if message["role"] == "assistant":
            table = parse_markdown_table(message["content"])
            if table is not None:
                st.download_button(
                    "Download as Excel",
                    data=dataframe_to_excel_bytes(table),
                    file_name="test_cases.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key=f"download_{i}",
                )
st.markdown("</div>", unsafe_allow_html=True)

with st.form(key="chat_form", clear_on_submit=True):
    user_input = st.text_input("Message", placeholder="KAN-6", label_visibility="collapsed")
    sent = st.form_submit_button("Send")

if sent and user_input.strip():
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.spinner("Generating test cases from Jira context..."):
        reply = handle_request(user_input)
    st.session_state.messages.append({"role": "assistant", "content": reply})
    st.rerun()
