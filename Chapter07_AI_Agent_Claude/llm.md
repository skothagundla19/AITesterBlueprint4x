# llm.md — Project Constitution

**Project:** Test Plan Creator from a Jira ID
**Status:** RATIFIED. Schema v2.0 is implemented and verified end to end against live Jira + Groq.

This file outranks convenience. If code and this document disagree, the code is wrong.

---

## 1. Architectural invariants

**I-01 — The LLM does exactly one job.**
Fetching, parsing, validating, rendering and writing files are deterministic and belong in `tools/`. The only probabilistic step is deriving the *ticket-specific* content of the plan — objective, features, scope, strategy, risks, gaps — from a normalized issue. Fixed organizational process (defect lifecycle, deliverables, approval table) is rendered from constants, not asked for. If a step can be written as an `if`, it must not be a prompt.

**I-02 — Layers do not reach across.**
- `architecture/` — Markdown SOPs. No code. The Golden Rule: if logic changes, the SOP changes *first*.
- Navigation — the reasoning/orchestration layer. Calls tools in order; performs no business logic itself.
- `server/tools/` — atomic JavaScript modules. Each takes a key or a plain object, returns JSON, and does one thing.

**I-03 — Everything flows through files in `.tmp/`.**
Tools do not pass live objects to each other. `.tmp/<KEY>.raw.json` → `.tmp/<KEY>.norm.json` → `.tmp/<KEY>.plan.json` → `output/<KEY>-test-plan.md`. Every stage is independently inspectable and re-runnable. Debugging a bad plan means opening the intermediate file, not re-running the pipeline with print statements.

**I-04 — Credentials live in `.env`, nowhere else.**
No tokens in code, in `.tmp/`, in logs, in committed fixtures, or in prompts. `.env.example` is committed with empty values; `.env` is git-ignored. Fixtures used for tests are scrubbed by hand.

**I-05 — Fail loud, never half-write.**
Any tool that cannot complete exits non-zero with a human-readable reason and writes no output file. A partial test plan is worse than no test plan, because someone will ship against it.

**I-06 — Deterministic given the same input.**
Same ticket at the same `updated` timestamp → same plan, modulo the LLM step. That step runs at temperature 0 and its output is schema-validated. Re-runs must not silently produce a different scope.

**I-07 — No network in tests.**
Every tool is testable offline against a recorded fixture. If a test needs Jira to be up, the tool is designed wrong.

---

## 2. Behavioural rules

**R-01 — Never invent requirements. This is the rule the project exists for.**
If the ticket does not state acceptance criteria — or an environment, a schedule, a tool choice, an owner — the plan says so. Every unsourced section is emitted as an explicit blank:

```
_Not stated in the source — to be confirmed._
```

Plausible-sounding invented acceptance criteria are the single most damaging failure this system can produce, because they are indistinguishable from real ones at review time. Silence is the correct output.

**R-02 — Traceability.**
Every item carrying a `source` names where it came from — a Jira field, or the literal `"inferred"`. Silence in the ticket is not a statement: concluding that an unmentioned test type is out of scope is an inference and must be labelled one. A reviewer must be able to ask "where did this come from?" and get an answer.

**R-03 — Separate observation from inference.**
"The ticket says X" and "therefore we should test Y" are different claims and are rendered differently. Inference is allowed and expected — that is the value the LLM adds — but it is labelled as inference.

**R-04 — Tone.**
Written for a QA engineer who has not read the ticket. Direct, concrete, no filler, no marketing. Plan content is specific, not "verify the feature works correctly".

**R-05 — Do-not list.**
Do not write Playwright/Selenium code (out of scope for v1). Do not modify anything in Jira. Do not guess environment URLs, credentials, or test data values. Do not pad a thin ticket into a long plan — a short plan for a three-line ticket is the honest output. **Do not write step-by-step test cases**: this artifact is a test plan, and cases are a deliverable it authorizes (§9), not part of it.

**R-06 — Schema or nothing.**
The generative step returns JSON matching `TestPlan` and nothing else — no prose wrapper, no fenced block. Invalid output gets one retry with the validation error appended, then the run hard-fails per I-05.

---

## 3. Data schemas

### 3.1 `NormalizedIssue` — output of `server/tools/normalizeIssue.js`, the LLM's *only* input

```json
{
  "key": "VWO-49",
  "url": "https://example.atlassian.net/browse/VWO-49",
  "summary": "Add saved-search filters to the jobs list",
  "issue_type": "Story",
  "status": "In Progress",
  "priority": "High",
  "components": ["web-ui", "search-api"],
  "labels": ["regression-risk", "q3"],
  "fix_versions": ["2026.09"],
  "parent": {"key": "VWO-12", "summary": "Job discovery epic"},
  "subtasks": [{"key": "VWO-50", "summary": "Filter chip component", "status": "Done"}],
  "links": [{"type": "blocks", "key": "VWO-77", "summary": "Search index migration"}],
  "attachments": [{"filename": "filters-spec.pdf", "mime": "application/pdf", "size": 148213}],
  "description_md": "## Context\nUsers cannot narrow the jobs list...",
  "acceptance_criteria": ["Filter persists across page reload"],
  "comments": [{"author": "A. Reviewer", "created": "2026-08-21T10:04:00Z", "body_md": "AC 3 was dropped."}],
  "fetched_at": "2026-08-30T07:26:00Z",
  "source_updated_at": "2026-08-29T16:11:00Z"
}
```

Notes that matter:
- `description_md` is **Markdown**, never raw ADF. Flattening happens in the tool (see `findings.md` F-04).
- `acceptance_criteria` is `[]` when the ticket has none. It is never populated by guessing.
- `source_updated_at` is the cache key and the determinism anchor.
### 3.2 `TestPlan` — output of the generative step, input to the renderer

**Schema version 2.0.** This is a **test plan** — the planning document — not a set of test cases.
Version 1.0 produced step-by-step scenarios; that was the wrong artifact. Detailed cases are a
*deliverable of* the plan (§9 of the rendered document), authorized by it, written after its
High-severity gaps are closed.

The model produces **only the parts that describe this ticket.** Everything that is fixed
organizational process — defect lifecycle, severity and priority scales, the deliverable list,
schedule activities, the approval table — is supplied deterministically by the renderer. Asking
a model to restate a fixed process is how process drift gets introduced.

```json
{
  "schema_version": "2.0",
  "issue_key": "KAN-6",
  "issue_url": "https://example.atlassian.net/browse/KAN-6",
  "generated_at": "2026-08-30T02:49:13.609Z",
  "model": "openai/gpt-oss-120b",

  "objective": "One paragraph: what 'tested' means for this ticket.",

  "features_to_test": [
    {"feature": "Filter dropdown", "detail": "Only active filters are listed",
     "priority": "P1", "source": "description"}
  ],

  "scope_in":  [{"item": "Functional Testing", "source": "description"}],
  "scope_out": [{"item": "Performance Testing", "source": "inferred"}],

  "test_environment": {
    "environments": [{"name": "QA", "purpose": "functional verification", "source": "inferred"}],
    "platforms": [], "browsers": [],
    "test_data": [{"item": "One active and one inactive filter", "source": "description"}]
  },

  "test_strategy": {
    "design_techniques": [{"technique": "Decision Table Testing", "why": "active/inactive × edit/duplicate"}],
    "execution_phases": [{"phase": "Regression Verification", "focus": "existing request screens"}]
  },

  "entry_criteria": ["Test environment provisioned"],
  "exit_criteria": ["No high-severity defects open"],
  "assumptions": ["Feature is behind no flag"],

  "risks": [
    {"risk": "Hiding inactive filters breaks saved requests", "mitigation": "Regression pass on saved requests",
     "impact": "high", "likelihood": "medium", "source": "inferred"}
  ],

  "gaps": [
    {"area": "Acceptance criteria", "finding": "KAN-6 states no testable acceptance criteria.",
     "question_for_author": "What are the acceptance criteria for KAN-6?", "severity": "high"}
  ]
}
```

Field rules that matter:

- **`source` names where a claim came from** — `description`, `acceptance_criteria[1]`,
  `components`, `comment by X` — or the literal `"inferred"` when the model reasoned it out.
  Rendered differently: a cited source prints as `_source: …_`, an inference prints as
  `_inferred — not stated in the ticket_` (R-03).
- **Silence is not a statement.** A ticket that never mentions performance testing has not
  declared it out of scope; concluding that is an inference. So `scope_out[].source` is almost
  always `"inferred"`, and only `"description"` when the ticket excludes something in words.
  This was got wrong on the first live run and corrected in the prompt.
- **`gaps[].question_for_author`** must be phrased so it can be pasted into a Jira comment
  unchanged. A finding the reporter cannot act on is not worth recording.
- **`gaps` is the honest-output channel for R-01.** An empty `gaps` array on a thin ticket is
  itself a bug. Three of them are enforced in code by `seal()`, not left to the model:
  missing acceptance criteria, empty description, and absent schedule.
- `priority` ∈ `P1 | P2 | P3`. `impact`, `likelihood`, `severity` ∈ `high | medium | low`.

### 3.2.1 What the renderer supplies, not the model

Fixed constants in `renderPlan.js`, identical on every plan:

| Section | Content |
|---|---|
| §1 Document Information | assembled from Jira fields; blanks stay blank |
| §8 Test Schedule | the five standard activities; dates and owners `_TBD_` |
| §9 Test Deliverables | the standard eight |
| §10 Entry & Exit Criteria | the four standard phases (ticket-specific criteria appended) |
| §11 Defect Management | lifecycle, severity and priority definitions |
| §13 Roles | standard roles; only names the ticket carries are filled |
| §15 Approvals | empty signature table |

### 3.3 Error envelope — every tool, on failure

```json
{"ok": false, "stage": "fetch", "code": "JIRA_404",
 "message": "Issue VWO-49 not found, or the token's account cannot see that project.",
 "hint": "Jira returns 404 for both cases. Check the key, then check project permissions."}
```

---

## 4. The generative step's contract

- **Input:** `NormalizedIssue` only. Never raw Jira JSON, never the ADF blob.
- **Output:** one `TestPlan` JSON object. Nothing else.
- **Temperature:** 0.
- **Provider:** Groq, OpenAI-compatible `POST /openai/v1/chat/completions`.
- **Model:** `openai/gpt-oss-120b` (free tier). Set in Settings, never floating in code.
- **Response format:** `{"type": "json_object"}`. `max_completion_tokens: 5000` — the free tier's 8000 tokens-per-minute ceiling counts the *reserved* budget, so a larger value is rejected with a 413 before the model runs (`findings.md` F-09).
- **Retry policy:** exactly one, with the validation errors fed back. A 429 additionally triggers one automatic wait honouring `Retry-After`. Two validation failures is a hard fail (I-05).
- **The prompt is specified in** `architecture/03_generate_test_plan.md`. The SOP is the source of truth; changing behaviour means editing the SOP first (Golden Rule, I-02).
- **On empty description:** still return a valid `TestPlan` — with `gaps` populated, a short plan, and no invented requirements. `seal()` guarantees the gap in code.
- **Schema hints must not be valid JSON of the wrong shape.** An enum written as `["a","b"]` gets returned as an array. Write enums as string unions (`findings.md` F-10).

---

## 5. Directory contract

```
Chapter07_AI_Agent_Claude/
├── Blast.md              # the protocol
├── task_plan.md          # phases, gates, checklists
├── findings.md           # research and constraints
├── progress.md           # append-only work log
├── llm.md                # this file — the constitution
├── architecture/         # Layer 1: Markdown SOPs (no code)
├── server/index.js       # Layer 2: Navigation — routes tools, no business logic
├── server/tools/         # Layer 3: atomic, deterministic modules
├── src/                  # React UI (Vite)
├── .tmp/                 # all intermediates, git-ignored
├── output/               # delivered test plans
├── tests/                # offline tests, no network
├── .env                  # git-ignored
└── .env.example          # committed, empty values
```

---

## 6. Amendment rule

This file changes by explicit decision, recorded with a dated entry in `progress.md` explaining what changed and why. It is not edited to match code that drifted.

---

## 7. Constitutional questions — resolved

1. **Cloud or Server?** ✅ **Cloud.** Verified live against `kothagundlasudheer.atlassian.net`: REST v3, ADF descriptions. Server/DC is untested; the walker passes string descriptions through, so it should degrade gracefully — reasoning, not evidence.
2. **Is the §3.2 schema the right shape?** ✅ **Resolved, and the first answer was wrong.** v1.0 emitted step-by-step scenarios — i.e. test *cases*. The team's actual artifact is the 14-section test plan template (recovered from this repo's git history at `QA_Skills/.claude/test-plan-creator/references/template/Test_Plan_Template.md`). Schema v2.0 matches it. Cases are a deliverable the plan authorizes, not its content.
3. **Delivery:** ✅ Markdown on screen, `.md` download, and `output/{KEY}-test-plan.{md,json}`. No write-back to Atlassian.
4. **Data handling:** ✅ Full ticket text goes to Groq. Accepted by the user in choosing a hosted model.
5. **Comments as a source:** ✅ **Context, with attribution.** The description is authoritative. Comments are consulted for acceptance criteria only when the description has none, and `ac_source` then records whose comment they came from — a weaker authority, and the plan says so.

## 8. Known limits

- Groq's free tier is 8000 tokens per minute. A ticket much larger than KAN-6 may still exceed it; the app waits once and retries rather than failing outright.
- No PDF renderer. The template's original form is a document; we emit Markdown.
- Jira Server/DC untested (see §7.1).
