"""Shared UI utilities for a cohesive Streamlit theme across pages."""

import streamlit as st


def inject_global_styles() -> None:
    """Inject app-wide CSS variables and component styles."""
    st.markdown(
        """
<style>
    :root {
        --bg-primary: #f6f8f5;
        --bg-surface: #ffffff;
        --bg-surface-soft: #edf3ee;
        --text-primary: #1e2d24;
        --text-muted: #5b6f62;
        --accent: #0f766e;
        --accent-strong: #0b4f49;
        --highlight: #d97706;
        --border-soft: #d4e2d8;
        --ok: #166534;
        --warn: #b45309;
    }

    .stApp {
        background:
            radial-gradient(circle at 10% 5%, #e7f3ea 0%, transparent 38%),
            radial-gradient(circle at 95% 0%, #fff4df 0%, transparent 30%),
            var(--bg-primary);
        color: var(--text-primary);
    }

    .app-hero {
        background: linear-gradient(120deg, #0f766e 0%, #14532d 70%);
        color: #fdfdfd;
        border-radius: 18px;
        padding: 1.2rem 1.4rem;
        margin-bottom: 0.9rem;
        box-shadow: 0 12px 28px rgba(15, 118, 110, 0.18);
    }

    .app-hero h1 {
        margin: 0;
        font-size: 1.6rem;
        line-height: 1.2;
    }

    .app-hero p {
        margin: 0.45rem 0 0 0;
        color: #e8fff8;
        font-size: 0.95rem;
    }

    .section-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-soft);
        border-radius: 16px;
        padding: 0.9rem 1rem;
        box-shadow: 0 8px 18px rgba(21, 76, 45, 0.06);
        margin-bottom: 0.8rem;
    }

    .section-card h3 {
        margin-top: 0;
        margin-bottom: 0.2rem;
        font-size: 1rem;
    }

    .section-help {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.88rem;
    }

    .status-row {
        display: flex;
        gap: 0.45rem;
        margin-bottom: 0.65rem;
        flex-wrap: wrap;
    }

    .status-badge {
        border-radius: 999px;
        padding: 0.2rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .status-badge.ok {
        background: #dcfce7;
        color: var(--ok);
        border: 1px solid #bbf7d0;
    }

    .status-badge.warn {
        background: #fff7ed;
        color: var(--warn);
        border: 1px solid #fed7aa;
    }

    .chat-shell {
        background: var(--bg-surface);
        border: 1px solid var(--border-soft);
        border-radius: 16px;
        padding: 0.4rem 0.7rem;
        margin-bottom: 0.85rem;
    }

    div[data-testid="stChatMessage"] {
        background: var(--bg-surface-soft);
        border: 1px solid #d9e7dc;
        border-radius: 14px;
        padding: 0.5rem 0.6rem;
    }

    div[data-testid="stChatMessage"]:has(div[data-testid="chatAvatarIcon-user"]) {
        background: #fffaf0;
        border-color: #f5d7a5;
    }

    .stButton > button,
    .stDownloadButton > button,
    .stFormSubmitButton > button {
        background: linear-gradient(120deg, var(--accent) 0%, var(--accent-strong) 100%);
        color: #f6fffd;
        border: 0;
        border-radius: 12px;
        min-height: 2.35rem;
        font-weight: 600;
        box-shadow: 0 8px 14px rgba(15, 118, 110, 0.2);
    }

    .stButton > button:hover,
    .stDownloadButton > button:hover,
    .stFormSubmitButton > button:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
    }

    .stTextInput input {
        border-radius: 10px;
        border: 1px solid #c9ddce;
    }

    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #edf7f2 0%, #f8fbf9 100%);
        border-right: 1px solid #d7e8de;
    }

    @media (max-width: 900px) {
        .app-hero {
            border-radius: 14px;
            padding: 1rem;
        }

        .app-hero h1 {
            font-size: 1.35rem;
        }

        .section-card {
            border-radius: 12px;
            padding: 0.75rem 0.8rem;
        }
    }
</style>
        """,
        unsafe_allow_html=True,
    )


def render_hero(title: str, subtitle: str) -> None:
    """Render the common page header hero block."""
    st.markdown(
        f"""
<div class="app-hero">
  <h1>{title}</h1>
  <p>{subtitle}</p>
</div>
        """,
        unsafe_allow_html=True,
    )


def render_card_header(title: str, helper_text: str) -> None:
    """Render a consistent card heading for grouped content."""
    st.markdown(
        f"""
<div class="section-card">
  <h3>{title}</h3>
  <p class="section-help">{helper_text}</p>
</div>
        """,
        unsafe_allow_html=True,
    )


def render_status_badges(badges: list[tuple[str, str]]) -> None:
    """Render compact status badges where style is one of: ok, warn."""
    badge_html = "".join(
        f'<span class="status-badge {style}">{label}</span>' for label, style in badges
    )
    st.markdown(f'<div class="status-row">{badge_html}</div>', unsafe_allow_html=True)


def render_sidebar_help(page_name: str) -> None:
    """Render context-specific sidebar guidance."""
    with st.sidebar:
        st.markdown("## Quick Guide (KAN-6)")
        if page_name == "chat":
            st.markdown('- Use a prompt like "KAN-6".')
            st.markdown("- Replies with markdown tables can be exported to Excel.")
            st.markdown("- Configure Jira and LLM provider in Settings page.")
        else:
            st.markdown("- Save Jira URL, email, and API token to enable ticket fetch.")
            st.markdown("- Keep Ollama URL for local generation by default.")
            st.markdown("- Use Groq token/provider for fallback or remote generation.")
