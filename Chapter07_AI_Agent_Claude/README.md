# Test Plan Creator — Jira ID → Test Plan

A lightweight React app built to the **B.L.A.S.T.** protocol (`Blast.md`) using the **A.N.T.** 3-layer architecture. Put in a Jira key, get back the 14-section **test plan** — objective, scope, strategy, environment, risks, entry/exit criteria and a gap analysis with questions to put back to the ticket author.

It produces a *plan*, not test cases. Detailed cases are a deliverable the plan authorizes (§9), written once its High-severity gaps are closed.

```
Jira issue ─► normalize ─► Groq (openai/gpt-oss-120b) ─► validate ─► render ─► output/*.md
```

---

## Run it

```bash
npm install
npm run dev          # proxy on :8787 + UI on http://localhost:5173
npm test             # 38 offline tests, no network needed
```

Then open **Settings** and fill in:

| | |
|---|---|
| Jira base URL | `https://yoursite.atlassian.net` |
| Jira email | your Atlassian account **email**, not a username |
| Jira API token | id.atlassian.com → Security → Create API token |
| Groq API key | console.groq.com/keys (free) |
| Model | `openai/gpt-oss-120b` (prefilled) |

Both sections have a **Test connection** button. Use them — a broken link fails there, clearly, instead of surfacing as a confusing error halfway through a run.

**Already configured?** If `Chapter03_Local_TestcaseGenerator/src/config/settings.json` exists, its Jira and Groq credentials prefill the Settings dialog automatically on first load. It only fills blanks, so anything you type here always wins. The token is read from where it already lives rather than being copied into this project — one less place for it to get committed.

Then type a key (`KAN-6`) and hit **Create test plan**.

---

## Why there is a server

Two reasons, both non-negotiable:

1. **The browser cannot call Jira.** Jira Cloud sends no CORS headers for Basic auth, so a direct `fetch` from the page fails regardless of how the request is written. Groq blocks browser origins too.
2. **An API token must never be shipped into browser JavaScript.** It is a full-account credential.

So `server/index.js` is a thin local proxy. It holds the credentials for the outbound calls and is also the **Navigation layer** — it routes between tools in order and contains no business logic of its own.

---

## Architecture (A.N.T.)

| Layer | Lives in | Rule |
|---|---|---|
| **1 — Architecture** | `architecture/*.md` | Technical SOPs. If the logic changes, the SOP changes *first*. |
| **2 — Navigation** | `server/index.js`, `App.jsx` `run()` | Routes data between tools. Performs no business logic. |
| **3 — Tools** | `server/tools/*.js` | Atomic, deterministic, individually testable. |

```
architecture/
  01_fetch_jira.md          02_normalize_issue.md
  03_generate_test_plan.md  04_render_output.md
server/tools/
  fetchJira.js       Jira REST + typed errors
  adfToMarkdown.js   ADF tree → Markdown
  normalizeIssue.js  raw Jira → NormalizedIssue
  generatePlan.js    ← the ONLY probabilistic step
  renderPlan.js      TestPlan → Markdown
```

**The LLM does exactly one job**: deriving the ticket-specific content of the plan from an already-normalized issue. Fetching, ADF flattening, AC extraction, validation, process boilerplate and rendering are all deterministic code. If a step can be written as an `if`, it is not a prompt.

---

## The rule this project exists for

> **Never invent requirements.**

A ticket with no acceptance criteria produces a plan that *says so* — a high-severity entry in `gaps` — rather than a plausible-sounding invented criterion. Fabricated AC are indistinguishable from real ones at review time, which is exactly what makes them dangerous.

This is enforced in three places, deliberately redundant:

1. **Extraction** is deterministic code (`extractAcceptanceCriteria`), not a model call. No AC found → `[]`.
2. **The prompt** states the rule three separate ways and requires a `gaps` entry.
3. **The seal step** inserts the missing-AC gap in code if the model omitted it. The model is asked to behave; the deterministic layer verifies that it did.

The same applies to everything else a ticket does not contain — schedule dates, staff names, environment URLs, tool choices. Those render as explicit blanks with a reason, never as plausible filler, and each becomes a question in §3.

Every item also carries a `source`, rendered either as `_source: description_` or as `_inferred — not stated in the ticket_`. A reader can always tell which half of the plan came from the ticket and which came from the model.

---

## Output

```
output/{KEY}-test-plan.md     the readable plan
output/{KEY}-test-plan.json   the validated TestPlan object
.tmp/{KEY}.raw.json           raw Jira response
.tmp/{KEY}.norm.json          exactly what the model was shown
.tmp/{KEY}.plan.json          validated plan
```

Debugging a bad plan means opening `.tmp/{KEY}.norm.json` to see what the model was actually given — not re-running the pipeline with print statements.

---

## Project memory (B.L.A.S.T. Protocol 0)

| File | Holds |
|---|---|
| `task_plan.md` | phases, gates, goals, definition of done |
| `findings.md` | Jira API research, exact requests, failure modes |
| `progress.md` | append-only log: what was done, what broke, what resulted |
| `llm.md` | the Constitution — schemas, behavioural rules, invariants |

---

## What the plan contains

Fifteen sections, following the team's test plan template:

| § | Section | Filled from |
|---|---|---|
| 1 | Document Information | Jira fields; blanks stay blank |
| 2 | Objective | the ticket |
| 3 | ⚠️ **Gaps & Questions for the Author** | gap analysis — deliberately before anything derived |
| 4 | Scope (in / out) | the ticket, each item citing its source |
| 5 | Features to be Tested | the ticket |
| 6 | Test Environment | the ticket, or an explicit blank |
| 7 | Test Strategy | design techniques with a reason each |
| 8 | Test Schedule | standard activities; dates `_TBD_` |
| 9 | Test Deliverables | standard |
| 10 | Entry & Exit Criteria | standard phases + ticket-specific |
| 11 | Defect Management | standard lifecycle and scales |
| 12 | Risks & Mitigation | the ticket |
| 13 | Roles & Responsibilities | standard roles; only names the ticket carries |
| 14 | Assumptions | the ticket |
| 15 | Approvals | empty signature table |

**§3 is the section that earns its keep.** It scores the requirement against a QA checklist —
functional, data & environment, non-functional, cross-cutting, clarity — and every finding comes
with a question phrased to be pasted into a Jira comment unchanged. On a real ticket it produced
eight, two of them High.

## The split that keeps the model honest

Two kinds of content meet in the renderer, and keeping them apart is the design:

- **Ticket-derived** — objective, features, scope, environment, strategy, risks, gaps. Every item
  names its `source`: a Jira field, or the literal `inferred`.
- **Process boilerplate** — defect lifecycle, severity and priority scales, deliverables,
  schedule activities, approvals. Fixed organizational standard, emitted from constants.

Asking a model to restate a fixed process is how process drift gets introduced — the severity
definitions would quietly differ between two plans. So it doesn't.

*Silence is not a statement.* A ticket that never mentions performance testing has not declared it
out of scope; concluding that is an inference, and the plan labels it as one.
