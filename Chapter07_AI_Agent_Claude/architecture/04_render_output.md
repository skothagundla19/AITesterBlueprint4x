# SOP 04 — Render and deliver

**Layer 1 (Architecture).**
**Implements:** `server/tools/renderPlan.js`, `POST /api/save`

---

## Goal

`TestPlan` JSON → the 14-section test plan document, as Markdown a QA lead can review without opening Jira. Deterministic; no model call.

The section structure follows the team's existing template, recovered from this repo's git history at `QA_Skills/.claude/test-plan-creator/references/template/Test_Plan_Template.md`.

## Two kinds of content meet here

Keeping them apart is the whole point of this file.

| | Source | Examples |
|---|---|---|
| **Ticket-derived** | the model, every item traceable | objective, features, scope, environment, strategy, risks, entry/exit, gaps |
| **Process boilerplate** | constants in this tool | defect lifecycle, severity/priority scales, deliverable list, schedule activities, roles, approval table |

Boilerplate is fixed organizational standard. Generating it would let it drift between plans, which is exactly what a standard exists to prevent.

## Section order, and why

1. **Document Information** — assembled from Jira fields. A null assignee renders `_unassigned — to be confirmed_`, not a guess.
2. **Objective**
3. **⚠️ Gaps & Questions for the Author** — *deliberately third, before anything derived from the ticket.* This is R-01 made visible: the reader must see what the source failed to say **before** reading anything built on it. Burying gaps at the bottom would let someone execute a plan without noticing its foundations were assumed. Rendered as a numbered table with severity and a pasteable question.
4. **Scope** — in/out, each item citing its source or marked inferred
5. **Features to be Tested** — priority, feature, coverage, source
6. **Test Environment** — environments, platforms, browsers, test data
7. **Test Strategy** — design techniques with a reason each; execution phases
8. **Test Schedule** — *boilerplate.* Five standard activities; dates and owners `_TBD_`, with a line saying why they cannot come from a ticket
9. **Test Deliverables** — *boilerplate*, including the note that detailed cases come later
10. **Entry & Exit Criteria** — *boilerplate* four phases, plus ticket-specific criteria appended
11. **Defect Management** — *boilerplate* lifecycle and scales; the Jira URL is real
12. **Risks & Mitigation** — risk, impact, likelihood, mitigation, source
13. **Roles & Responsibilities** — *boilerplate* roles; only names the ticket carries are filled
14. **Assumptions**
15. **Approvals** — *boilerplate* empty signature table

Then a **human review gate** counting the High-severity gaps still open.

## Rendering rules

- Empty arrays render as `_Not stated in the source — to be confirmed._` — **never omitted silently.** An absent section reads as an oversight; an explicit blank reads as a finding.
- A `source` of `"inferred"` renders as `_inferred — not stated in the ticket_`; anything else renders as `_source: …_` (R-03). The distinction must survive into the document, not stay in the JSON.
- **Pipes in model output are escaped** before entering a table cell. An unescaped `|` in a feature name would silently break the table structure.
- Empty cells render as `—` so a row never collapses.

## Delivery

`POST /api/save` writes:

- `output/{KEY}-test-plan.md`
- `output/{KEY}-test-plan.json` (the validated `TestPlan`, for anything downstream)

The browser also offers a direct `.md` download that needs no server round-trip.

**Path safety:** the issue key is the only user-controlled value that reaches the filesystem, so it is stripped to `[A-Za-z0-9_-]` before being joined to a path. A key that reduces to nothing is rejected rather than defaulted.

## Intermediates

Per llm.md I-03, every stage lands in `.tmp/`:

```
.tmp/{KEY}.raw.json    raw Jira response
.tmp/{KEY}.norm.json   NormalizedIssue — exactly what the model saw
.tmp/{KEY}.plan.json   validated TestPlan
```

Debugging a bad plan means opening `.tmp/{KEY}.norm.json` to see what the model was actually given, not re-running the pipeline with print statements.
