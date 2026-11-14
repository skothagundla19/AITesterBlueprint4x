# SOP 03 — Generate the test plan

**Layer 1 (Architecture).**
**Implements:** `server/tools/generatePlan.js`
**Output schema:** `llm.md` §3.2 `TestPlan` (v2.0)

---

## Goal

This is **the one probabilistic step in the entire system** (llm.md I-01). Everything before it is deterministic reading; everything after it is deterministic rendering. It exists to do the single thing code cannot: decide what is worth testing, what could go wrong, and what the ticket failed to say.

## What it produces — and what it must not

It produces a **test plan**: a planning document. Objective, features to be tested, scope, environment needs, strategy, risks, entry/exit criteria, and a gap analysis.

It must **not** produce test cases. No step-by-step steps, no expected results. Detailed cases are §9 of the rendered plan — a *deliverable the plan authorizes*, written after the High-severity gaps are closed. v1.0 of this tool got that wrong and emitted scenarios with steps; the fix was not a bigger prompt but a different artifact.

It also produces **only the ticket-specific content.** The defect lifecycle, severity and priority scales, the deliverable list, the schedule activities and the approval table are fixed organizational process, supplied as constants by SOP 04. Asking a model to restate a fixed process is how process drift gets introduced.

## Contract

| | |
|---|---|
| Input | `NormalizedIssue` only — never raw Jira JSON |
| Output | one `TestPlan` JSON object, nothing else |
| Provider | Groq, OpenAI-compatible `POST /openai/v1/chat/completions` |
| Model | `openai/gpt-oss-120b` (free tier) |
| Temperature | `0` — llm.md I-06, determinism |
| Response format | `{"type": "json_object"}` |
| `max_completion_tokens` | `5000` — see "Token budget" below |
| Timeout | 180s |

## The prompt's hard rules

R-01 is stated several ways, deliberately. It is the failure this project exists to prevent, and models drift toward helpfulness — toward filling a blank with something plausible.

1. **Never invent requirements or project facts.** A Jira ticket contains no schedule dates, staff names, environment URLs, tool choices or sign-off owners. Unstated → `gaps`, never a plausible filler.
2. **Separate what the ticket says from what you concluded.** Every `source` names a Jira field or the literal `"inferred"`.
   *Silence is not a statement.* A ticket that never mentions performance testing has not declared it out of scope — concluding that is an inference. So `scope_out[].source` is almost always `"inferred"`. This was got wrong on the first live run against KAN-6 and corrected here.
3. **Scope must be about this ticket.** Not every test type in existence.
4. **Do not pad.** A three-line ticket earns a short plan.
5. **Write for a QA engineer who has not read the ticket.**

## Gap analysis

The prompt carries the requirement checklist (recovered from `QA_Skills/.claude/test-plan-creator/references/requirement-checklist.md`) as its framework: functional, data & environment, non-functional, cross-cutting, clarity. Every ⚠️/❌ becomes a `gaps` entry.

Each gap carries a `question_for_author` phrased to be **pasted into a Jira comment unchanged**. A finding the reporter cannot act on is not worth recording.

## Validation — schema or nothing (R-06)

`validateTestPlan()` is hand-rolled, no dependency. It checks the objective, the eight top-level arrays, the two nested objects and their arrays, and per-item: feature priority ∈ P1/P2/P3 with a non-empty `source`; risk impact/likelihood ∈ high/medium/low with a mitigation; gap area/finding/question/severity.

**Retry policy:** exactly one. The failed JSON and the validation errors go back as a follow-up turn. A second failure hard-fails with `PLAN_INVALID` and writes nothing (I-05). We do not loop — a model that fails twice at temperature 0 will fail a third time.

Non-JSON output gets the same treatment plus a fence-stripping pass; models sometimes wrap JSON in a fence despite instructions.

## The deterministic seal

After validation, `seal()` applies what is too important to leave to the model:

1. **Stamp** `schema_version`, `issue_key`, `issue_url`, `generated_at` from the issue — not from the model.
2. **Enforce three R-01 invariants in code**, inserting the gap if the model omitted it:
   - no acceptance criteria → High
   - empty description → High
   - no due date → Medium, because a Jira ticket never carries a schedule and §8 must not imply one

That last point is the architecture in miniature: the model is *asked* to behave, and the deterministic layer *verifies* that it did.

## Token budget and rate limits

Groq's free tier caps **tokens per minute at 8000**, and the ceiling counts the *reserved* `max_completion_tokens`, not the tokens actually generated. A budget of 8000 therefore blows the limit before the model runs, returning `413`. Hence 5000.

A `429` carries a stated wait ("try again in 41.6s"). The tool waits once — honouring `retry-after`, else parsing the body, capped at 70s — rather than handing the user an error they can only resolve by clicking again.

## Errors

| Code | Meaning |
|---|---|
| `GROQ_NO_KEY` | no key configured |
| `GROQ_401` | key rejected |
| `GROQ_413` | tokens-per-minute ceiling, *not* an oversized body |
| `GROQ_429` | rate limited; retried once automatically first |
| `GROQ_UNREACHABLE` | network failure or 180s timeout |
| `PLAN_INVALID` | schema-invalid after one retry; the hint lists the validation failures |
