# SOP 01 — Fetch the source

**Layer 1 (Architecture).** Golden Rule: if the logic changes, this SOP changes *before* the code.
**Implements:** `server/tools/fetchJira.js`
**Routed by:** `POST /api/issue`

---

## Goal

Turn one issue key into raw Jira JSON. No interpretation happens here. This step reads; it does not think.

## Inputs

| Name | From | Required |
|---|---|---|
| `baseUrl` | Settings | yes (Jira source) |
| `email` | Settings | yes (Jira source) |
| `token` | Settings | yes (Jira source) |
| `key` | main input, e.g. `KAN-6` | yes (Jira source) |

## Logic

1. Normalize `baseUrl` — strip trailing slashes, reject anything without `http(s)://`.
2. Validate the key against `^[A-Z][A-Z0-9_]+-\d+$` **before** spending a network call on it.
3. `GET /rest/api/3/issue/{KEY}` with the field list below and `expand=renderedFields`.
4. `GET /rest/api/3/issue/{KEY}/comment` — **best-effort**. Comment permissions are separate from issue permissions; a failure here must not sink an otherwise good fetch.
5. Dump the raw response to `.tmp/{KEY}.raw.json` before anything touches it.

Fields requested:

```
summary, description, issuetype, status, priority, components, labels,
fixVersions, issuelinks, attachment, subtasks, parent, duedate,
assignee, reporter, created, updated
```

This list is inherited from the precedent script recovered in `findings.md` F-02, plus status/parent/subtasks, which the plan's dependency and entry-criteria sections need.

## Auth

Basic, `base64(email:token)`. The **email**, not a username — this is the single most common 401 cause and the error message says so explicitly.

## Edge cases

| Condition | Behaviour |
|---|---|
| `400` | `JIRA_400` — malformed key |
| `401` | `JIRA_401` — say "use email, not username", name the token page |
| `403` | `JIRA_403` — likely captcha lock; tell them to log in via browser once |
| `404` | `JIRA_404` — **must not claim to know** whether the issue is missing or merely invisible; Jira returns 404 for both, so the message says both |
| `429` | `JIRA_429` — rate limited |
| network / DNS | `JIRA_UNREACHABLE` — names the base URL that failed |
| comments 403 | swallow, return `[]` |

Nothing is written on failure (llm.md I-05).

## Output

Raw Jira JSON `{ issue, comments, baseUrl }`.
