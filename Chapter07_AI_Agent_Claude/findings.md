# findings.md — Research, Discoveries, Constraints

**Project:** Test Plan Creator from a Jira ID
**Phase:** Protocol 0 / pre-Blueprint research
**Created:** 2026-08-30

Everything below is either (a) verified against docs/prior code in this repo, or (b) explicitly marked **ASSUMPTION** and therefore blocked pending Discovery.

---

## F-01 — Jira Cloud vs Server changes the whole fetch layer

This is the single biggest fork in the road, which is why it is Discovery Question #1.

| | Jira **Cloud** | Jira **Server / Data Center** |
|---|---|---|
| Base path | `/rest/api/3` | `/rest/api/2` |
| Auth | Basic: `email:API_TOKEN` | Bearer PAT, or Basic `user:password` |
| `description` field | **ADF** — Atlassian Document Format, a nested JSON doc | Wiki markup **string** |
| Token minted at | id.atlassian.com → Security → API tokens | Profile → Personal Access Tokens |

**Consequence:** the description parser is not shared between the two. On Cloud we walk an ADF tree; on Server we parse (or pass through) wiki markup. Writing that parser before this is answered would be guessing at business logic — forbidden by the protocol.

**ASSUMPTION for planning purposes:** Jira Cloud, REST v3, ADF. To be confirmed.

---

## F-02 — Prior art already in this repo

`git show HEAD:QA_Skills/.claude/test-plan-creator/scripts/fetch_jira.sh` is a working precedent from the Chapter05 skills import. It proves the shape of the call and the field set someone already found sufficient for a test plan. Worth reusing as the starting field list rather than inventing one:

```
summary, description, issuetype, priority, components, labels,
fixVersions, issuelinks, attachment
```

Its weaknesses, and what we should improve on: it is `curl | jq` with no error handling, no ADF flattening (it emits the raw ADF blob straight into the output), and no caching. Our `tools/fetch_jira.py` should keep its field list and fix those three things.

---

## F-03 — The exact requests we will use

### Handshake / credential check (the Phase 2 "Link" gate)

Cheapest possible authenticated call. If this fails, nothing else is worth trying.

```bash
curl -sS -w '\nHTTP %{http_code}\n' \
  -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/myself"
```

Expect `200` and a body containing `displayName` / `emailAddress`.
`401` = bad token or wrong email. `403` = token fine, account captcha-locked. A `404` on *this* endpoint almost always means `JIRA_BASE_URL` is wrong (trailing path, or a Server instance).

### Fetch one issue (the core call)

```bash
curl -sS \
  -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/issue/$KEY?fields=summary,description,issuetype,status,priority,components,labels,fixVersions,issuelinks,attachment,subtasks,parent,duedate,assignee,reporter,created,updated"
```

### Fetch with rendered HTML + comments (comments often hold the real acceptance criteria)

```bash
curl -sS \
  -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/issue/$KEY?expand=renderedFields,changelog&fields=*navigable"
```

`expand=renderedFields` is the useful trick: Jira hands back **HTML** versions of the ADF fields alongside the raw ADF. HTML to Markdown is a far shorter path than writing an ADF walker. Strongly consider `renderedFields.description` as the primary text source, keeping raw ADF only as a fallback.

Comments, if not already included, come from their own endpoint:

```bash
curl -sS -u "$JIRA_EMAIL:$JIRA_TOKEN" -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/issue/$KEY/comment?maxResults=50&expand=renderedBody"
```

### Pull subtasks and linked issues in one shot with JQL

⚠️ **Corrected 2026-08-30 against the live instance.** `/rest/api/3/search` **has been removed**
by Atlassian (changelog CHANGE-2046) and now returns an error telling you to migrate. The
replacement is `/rest/api/3/search/jql`, which additionally **rejects unbounded queries** — an
`order by created DESC` with no filter fails with "Unbounded JQL queries are not allowed here."
Always constrain by project or key.

```bash
curl -sS -G \
  -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -H "Accept: application/json" \
  --data-urlencode "jql=project = KAN ORDER BY created DESC" \
  --data-urlencode "fields=key,summary,issuetype,status" \
  --data-urlencode "maxResults=20" \
  "$JIRA_BASE_URL/rest/api/3/search/jql"
```

The app itself does not use this endpoint — subtasks and links come back on the issue payload —
so the removal cost us nothing. Recorded because the original note here was wrong.

### Download an attachment (specs and mockups sometimes live only here)

Attachment `content` URLs come back inside the issue JSON. They need the same auth and they redirect, hence `-L`:

```bash
curl -sSL -u "$JIRA_EMAIL:$JIRA_TOKEN" -o ".tmp/$KEY-spec.pdf" "<attachment.content URL>"
```

### Python equivalent (what `tools/fetch_jira.py` will actually do)

```python
import os, requests
from requests.auth import HTTPBasicAuth

BASE = os.environ["JIRA_BASE_URL"].rstrip("/")
AUTH = HTTPBasicAuth(os.environ["JIRA_EMAIL"], os.environ["JIRA_TOKEN"])
FIELDS = ("summary,description,issuetype,status,priority,components,labels,"
          "fixVersions,issuelinks,attachment,subtasks,parent,duedate")

r = requests.get(
    f"{BASE}/rest/api/3/issue/{key}",
    params={"fields": FIELDS, "expand": "renderedFields"},
    auth=AUTH,
    headers={"Accept": "application/json"},
    timeout=30,
)
r.raise_for_status()   # 401/403/404 surface here, loudly, before any file is written
```

---

## F-04 — ADF is the real work item

Jira Cloud's `description` is not text. It is a tree:

```json
{"type": "doc", "version": 1, "content": [
  {"type": "paragraph", "content": [{"type": "text", "text": "User can filter jobs"}]},
  {"type": "bulletList", "content": []},
  {"type": "table", "content": []}
]}
```

Handing that blob to an LLM raw is wasteful (JSON scaffolding eats tokens) and lossy (tables degrade into noise). Two options, in preference order:

1. **`expand=renderedFields`** → Jira's own HTML → `markdownify` / `html2text` → Markdown. Cheap; handles tables, panels, code blocks and links for free. **Recommended.**
2. A hand-written ADF walker covering `paragraph, text, hardBreak, bulletList, orderedList, listItem, heading, codeBlock, table/tableRow/tableCell, panel, mediaSingle, inlineCard`. More control, more code, more edge cases.

Plan: option 1 as primary, option 2 only if renderedFields proves unusable.

---

## F-05 — Field-to-test-plan mapping (draft)

Which Jira field feeds which section of the plan. This mapping is what makes the output traceable:

| Test plan section | Sourced from |
|---|---|
| Title / ID | `key`, `summary` |
| Feature overview | `summary` + normalized `description` |
| Scope — in | description body, subtasks, `components` |
| Scope — out | explicit "out of scope" text only, otherwise `MISSING` |
| Acceptance criteria | AC heading in description, else comments, else `MISSING` |
| Risk / priority | `priority`, `labels`, `issuetype` |
| Dependencies | `issuelinks`, `parent`, `subtasks` |
| Environments | `fixVersions`, `components`, `labels` |
| Test scenarios | **LLM-derived** from all of the above — the one generative step |
| Entry / exit criteria | template defaults + `status` |

Anything with no source is emitted as an explicit gap. It is never invented. See `llm.md` rule R-01.

---

## F-06 — Rate limits, safety, hygiene

- Jira Cloud returns `429` with a `Retry-After` header. A single-ticket CLI is unlikely to hit it, but a webhook-driven or scheduled-sweep trigger will. Retry with backoff and honour `Retry-After`.
- API tokens are full-account credentials. `.env` only, `.env` in `.gitignore`, `.env.example` committed with empty values. Never log the token; never echo the full `Authorization` header.
- Ticket text may contain customer data. Discovery Question #5 must establish whether it is allowed to leave the network boundary for the LLM call.
- `.tmp/` holds every intermediate artifact, per the protocol, and is git-ignored.

---

## F-07 — Failure modes worth designing for now

| Failure | Cause | Intended handling |
|---|---|---|
| `401` | bad/expired token, or username used instead of email | fail at handshake, name the env var to fix |
| `403` | captcha lock after failed logins | tell the user to log in via browser to clear it |
| `404` on the issue | typo'd key, or no permission on that project | Jira returns 404 for both — say so rather than guessing |
| Empty `description` | ticket written as a one-liner | generate the plan, mark AC/scope `MISSING`, invent nothing |
| ADF with tables/panels | rich ticket | renderedFields path handles it; assert non-empty output |
| Huge ticket, 50+ comments | epic-ish ticket | truncate deterministically and log what was dropped |
| LLM returns non-schema JSON | model drift | validate, one retry with the validation error, then hard-fail |

---

## F-08 — External research

**Status: pending.** Phase 1 step 3 asks for a scan of public repos for reusable Jira → test-plan work. Candidates to review before writing our own: `atlassian-python-api`, existing ADF-to-Markdown packages, and IEEE-829 / ISTQB test plan templates. Links and verdicts get recorded here once that scan is actually run. Nothing has been borrowed yet — this section is a placeholder, not a finding.

---

## F-09 — Groq free tier: two limits that bite in practice

Both hit for real on 2026-08-30 (see `progress.md`), both now handled in `generatePlan.js`.

1. **8000 tokens per minute**, and the ceiling counts the **reserved** `max_completion_tokens`,
   not the tokens actually generated. An 8000-token budget therefore blows an 8000 TPM limit
   before the model runs, returning **413** with `code: rate_limit_exceeded`. Budget is now 5000.
2. **429 with a stated wait** ("Please try again in 41.6025s"). The app now waits once —
   reading `retry-after`, falling back to parsing the body, capped at 70s — instead of surfacing
   an error the user can only resolve by clicking again.

A third, subtler one worth recording: because the window is per minute, a failed attempt and its
retry compete for the same budget. That made the prompt bug below expensive rather than merely
untidy.

## F-10 — Schema hints in a prompt must not be valid JSON of the wrong shape

The prompt's schema block rendered the allowed scenario types as `JSON.stringify(TYPES)`:

```
"type": ["functional","negative","boundary", …],
```

That is a JSON **array literal**, so the model dutifully returned an array — failing validation
on every scenario, on every run, and burning a retry each time. Writing it as a string union,
`"functional"|"negative"|…` — the way `priority` was already written — fixed it immediately:
2 attempts became 1, and the plan gained scenarios the truncating retry had been losing.

The general lesson: when you illustrate a schema by example, every fragment is read as an
example. An enum shown as an array will be produced as an array.

---

## Confirmed vs assumed — running tally

**Confirmed by running it against the live instance (2026-08-30)**
- Jira Cloud REST v3 auth, `/myself`, `/issue/{key}`, `/issue/{key}/comment` all behave as documented.
- ADF walker handles a real ticket: bold marks, nested bullets, numbered sections (KAN-6).
- `/rest/api/3/search` is **removed**; `/rest/api/3/search/jql` replaces it and rejects unbounded JQL (F-03).
- Groq `openai/gpt-oss-120b` is available on the free tier and honours JSON mode at temperature 0.
- The free tier's TPM limits and their exact failure modes (F-09).
- The precedent script and its field list exist in this repo's git history (F-02).

**Still assumed — not blocking, but unverified**
- Jira **Server/DC** behaviour. The walker passes string descriptions through, so it should
  degrade gracefully, but no Server instance has been tested. This is reasoning, not evidence.
- Behaviour on a ticket much larger than KAN-6, which may still exceed 8000 TPM even at a
  5000-token budget. The 429 backoff covers the common case, not an oversized single request.
