"""Generate test cases via Ollama (default) with automatic Groq fallback."""
import requests

OLLAMA_MODEL = "gemma3:1b"
GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMClientError(Exception):
    pass


def build_prompt(ticket: dict, template: str) -> str:
    requirements = (
        f"Summary: {ticket['summary']}\n"
        f"Description: {ticket['description']}\n"
        f"Acceptance Criteria: {ticket['acceptance_criteria']}"
    )
    filled = (
        template.replace("[NUMBER]", "an appropriate number of")
        .replace("[FEATURE]", f"{ticket['key']} - {ticket['summary']}")
        .replace("[PASTE REQUIREMENTS HERE]", requirements)
    )
    return filled


def generate_test_cases(ticket: dict, template: str, settings: dict) -> str:
    prompt = build_prompt(ticket, template)
    provider = settings.get("provider", "ollama")

    if provider == "groq":
        return _call_groq(prompt, settings.get("groq_token", ""))

    try:
        return _call_ollama(prompt, settings.get("ollama_url", "http://localhost:11434"))
    except LLMClientError:
        if settings.get("groq_token"):
            return _call_groq(prompt, settings["groq_token"])
        raise


def _call_ollama(prompt: str, ollama_url: str) -> str:
    ollama_url = (ollama_url or "http://localhost:11434").rstrip("/")
    try:
        response = requests.post(
            f"{ollama_url}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=(5, 120),
        )
    except requests.exceptions.RequestException as exc:
        raise LLMClientError(f"Ollama unavailable at {ollama_url}: {exc}") from exc

    if not response.ok:
        raise LLMClientError(f"Ollama API error ({response.status_code}): {response.text}")

    return response.json().get("response", "").strip()


def _call_groq(prompt: str, groq_token: str) -> str:
    if not groq_token:
        raise LLMClientError("No Groq API token configured in Settings.")

    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {groq_token}"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
    except requests.exceptions.RequestException as exc:
        raise LLMClientError(f"Could not reach Groq: {exc}") from exc

    if not response.ok:
        raise LLMClientError(f"Groq API error ({response.status_code}): {response.text}")

    return response.json()["choices"][0]["message"]["content"].strip()
