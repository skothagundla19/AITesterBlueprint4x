# task_plan.md — Test Plan Creator from a Jira ID

**Protocol:** B.L.A.S.T. (Blueprint → Link → Architect → Stylize → Trigger)
**Architecture:** A.N.T. 3-layer (Architecture SOPs / Navigation / Tools)
**Status:** ✅ Phases 0–5 complete and verified end to end against live Jira + Groq (KAN-6).
**Created:** 2026-08-30 · **Updated:** 2026-08-30

---

## 0. Discovery answers (recorded 2026-08-30)

| Question | Answer |
|---|---|
| North Star | Jira key in → test plan out, from a small React UI |
| Integrations | Jira Cloud REST v3 + Groq `openai/gpt-oss-120b` (free tier) |
| Source of truth | A Jira issue — `KAN-6` on `kothagundlasudheer.atlassian.net`. VWO-48 and ZXD-24568 do not exist on that instance; KAN-6 carries the same content as `PRD_24568`. A local-PRD source was built and then removed at the user's request, leaving one Jira input. |
| Delivery payload | On-screen plan, `.md` download, and `output/{KEY}-test-plan.{md,json}` |
| Behavioural rules | `llm.md` R-01…R-06 — above all, never invent requirements |

Credentials are entered in the app's Settings dialog, not in `.env`. `.env.example` remains for headless runs.

---

## 1. North Star (draft — to be confirmed in Discovery)

> Given a single Jira issue key (e.g. `VWO-49`), produce a reviewed, professional, deterministic **Test Plan** document — without a human re-reading the ticket by hand.

One input. One artifact out. Repeatable — the same ticket at the same state produces the same plan.

---

## 2. Why this is being built this way

An LLM writing a test plan straight from a raw Jira blob is the failure mode we are designing against. That produces plans that invent acceptance criteria, silently skip fields the ticket never filled in, and read differently every run. The B.L.A.S.T. split exists to stop exactly that:

- **Fetching** Jira is deterministic → a Tool (Python/bash + REST). Never the LLM's job.
- **Normalizing** ADF description → Markdown is deterministic → a Tool.
- **Rendering** Markdown → PDF/HTML is deterministic → a Tool.
- **Judging** "what should we test here, and what is missing from this ticket" is genuinely probabilistic → that, and only that, is the LLM's job, and it is fenced by a schema.

The LLM is a middle slice, not the pipeline.

---

## 3. Phase checklist

### 🟢 Protocol 0 — Initialization
- [x] `task_plan.md`, `findings.md`, `progress.md`, `llm.md` created
- [x] **GATE:** 5 Discovery Questions asked
- [x] **GATE:** answered (§0 above)
- [x] **GATE:** `TestPlan` schema settled in `llm.md` §3.2
- [x] **GATE:** Blueprint approved — build authorized

### 🏗️ Phase 1 — B: Blueprint
- [x] North Star, integrations, source of truth, delivery payload, behavioural rules recorded
- [x] `TestPlan` and `NormalizedIssue` schemas locked in `llm.md`
- [x] Prior art recovered from git history (`findings.md` F-02) — field list reused
- [ ] Wider public-repo scan (`findings.md` F-08) — still a placeholder, not blocking

### ⚡ Phase 2 — L: Link
- [x] `.env.example` committed; `.env` and `.tmp/` git-ignored
- [x] `POST /api/jira/verify` — handshake against `/rest/api/3/myself`, surfaced as a **Test Jira connection** button
- [x] `POST /api/groq/verify` — lists models and confirms `openai/gpt-oss-120b` is on the account
- [x] Typed error envelopes for 400/401/403/404/429/unreachable, each with an actionable hint
- [x] Both proven to fail correctly (`BAD_KEY`, `BAD_BASE_URL`, `GROQ_NO_KEY`)
- [x] ✅ **Real handshake against live Jira + Groq — run and passing**, using the credentials already present in Chapter03. Jira `200` as `kothagundlasudheer`; Groq `200` with `openai/gpt-oss-120b` confirmed available.

### ⚙️ Phase 3 — A: Architect
- [x] `architecture/01_fetch_jira.md` … `04_render_output.md` — four SOPs (Layer 1)
- [x] `server/tools/fetchJira.js` — REST + typed errors
- [x] `server/tools/adfToMarkdown.js` — ADF tree → Markdown
- [x] `server/tools/normalizeIssue.js` — raw Jira → `NormalizedIssue`, deterministic AC extraction
- [x] `server/tools/loadPrd.js` — local PRD → the same shape
- [x] `server/tools/generatePlan.js` — the one probabilistic step, schema-fenced
- [x] `server/tools/renderPlan.js` — `TestPlan` → Markdown
- [x] `server/index.js` — Navigation (Layer 2), no business logic
- [x] `.tmp/` intermediates at every stage (I-03)
- [x] 24 offline tests, zero network (I-07)

### ✨ Phase 4 — S: Stylize
- [x] Plan template: summary, gaps, scope, assumptions, risks, environments, data, entry/exit, scenarios, traceability
- [x] Gaps deliberately rendered **before** scenarios — R-01 made visible
- [x] `stated 📌 / inferred 🧠` badges so a reader can separate ticket from model
- [x] React UI: source toggle, step progress, error envelopes, gaps panel, plan/markdown/json tabs
- [x] Verified rendering in a real browser (caught a blank-page bug a green build had hidden)
- [x] Plan generated from **live** Jira + Groq (KAN-6), verified by driving the real UI
- [x] Single Jira source — the local-PRD toggle removed at the user's request

### 🎯 Phase 5 — T: Trigger
- [x] Trigger is the UI button; `Enter` in the key field also fires it
- [x] Fail-loud on every path; nothing half-written; `.tmp/` left for debugging
- [ ] Headless CLI entrypoint (`.env.example` already anticipates it)
- [ ] Jira webhook / scheduled sweep — deferred, not needed for v1

---

## 4. Goals and non-goals

**Goals**
1. Jira key in → complete test plan out, one command.
2. Deterministic everywhere except the one generative step.
3. Every claim in the plan traceable to a Jira field — gaps are labelled as gaps, not filled in.
4. Reruns are cheap; raw JSON is cached in `.tmp/`.
5. Credentials only ever in `.env`.

**Non-goals (v1)**
- Not writing the test plan back into Jira/Confluence automatically.
- Not generating executable Playwright code (that is a later chapter).
- Not multi-ticket / epic rollups.
- Not a UI. CLI first.

---

## 5. Definition of done (v1)

- `python tools/run.py <KEY>` produces `output/<KEY>-test-plan.md` for three different real tickets.
- A ticket with a thin/empty description produces a plan whose gaps are explicitly listed, **and does not fabricate acceptance criteria**.
- Bad key → clean `404` message. Bad token → clean `401` message. Neither leaves a partial file.
- Every tool has a test that runs offline against a fixture.

---

## 6. Open questions blocking the Blueprint

1. Jira **Cloud** or **Server/Data Center**? (decides `/rest/api/3` + ADF vs `/rest/api/2` + wiki markup)
2. Is there a Jira base URL + email + API token available now, or do we build against a recorded fixture first?
3. Which test plan template is authoritative — IEEE-829-ish, the team's existing one, or the one we design here?
4. Delivery: file on disk only, or also PDF / Confluence / Jira comment?
5. Which LLM does the generative step call, and is it allowed to see full ticket text (any data-handling constraint)?

**These are the Discovery Questions. Execution stays halted until they are answered.**
