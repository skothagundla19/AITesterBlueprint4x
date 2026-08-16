"""Fetch ticket details from the Jira REST API."""
import requests
from requests.auth import HTTPBasicAuth


class JiraClientError(Exception):
    pass


def get_ticket(key: str, settings: dict) -> dict:
    jira_url = (settings.get("jira_url") or "").rstrip("/")
    email = settings.get("jira_email") or ""
    token = settings.get("jira_token") or ""

    if not jira_url or not email or not token:
        raise JiraClientError(
            "Jira settings are incomplete. Please fill in Jira URL, email, and token on the Settings page."
        )

    url = f"{jira_url}/rest/api/2/issue/{key}"
    try:
        response = requests.get(
            url,
            auth=HTTPBasicAuth(email, token),
            headers={"Accept": "application/json"},
            timeout=15,
        )
    except requests.exceptions.RequestException as exc:
        raise JiraClientError(f"Could not reach Jira at {jira_url}: {exc}") from exc

    if response.status_code == 404:
        raise JiraClientError(f"Jira ticket '{key}' was not found.")
    if response.status_code in (401, 403):
        raise JiraClientError("Jira authentication failed. Check the email/token in Settings.")
    if not response.ok:
        raise JiraClientError(f"Jira API error ({response.status_code}): {response.text}")

    fields = response.json().get("fields", {})
    return {
        "key": key,
        "summary": fields.get("summary", ""),
        "description": _extract_description(fields.get("description")),
        "acceptance_criteria": fields.get("customfield_10000", ""),
    }


def _extract_description(description) -> str:
    """Handle both plain-text (Jira Server) and Atlassian Document Format (Jira Cloud) descriptions."""
    if description is None:
        return ""
    if isinstance(description, str):
        return description
    if isinstance(description, dict):
        return _adf_to_text(description)
    return str(description)


def _adf_to_text(node) -> str:
    if not isinstance(node, dict):
        return ""
    text_parts = []
    if node.get("type") == "text":
        text_parts.append(node.get("text", ""))
    for child in node.get("content", []) or []:
        text_parts.append(_adf_to_text(child))
    return " ".join(part for part in text_parts if part)
