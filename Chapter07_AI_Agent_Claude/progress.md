# progress.md — Work Log

Append-only. Newest entry at the bottom. Every entry records **what was done, what broke, and what the result was** — including the dead ends, because a log that only shows successes is useless for debugging.

**Entry format**

```
### [YYYY-MM-DD HH:MM] <phase> — <short title>
**Did:**
**Error:**
**Result:**
**Next:**
```

---

### [2026-08-30 07:26] Protocol 0 — Repo reconnaissance
**Did:** Located the working folder `Chapter07_AI_Agent_Claude/`. Found it contained exactly one file, `Blast.md` (3392 bytes), and nothing else — no `tools/`, no `architecture/`, no `.env`, no memory files. Read `Blast.md` in full to extract the protocol's hard constraints.
**Error:** Initial `ls` of the folder path succeeded, but a first pass looking for `BLAST.md` by that exact casing needed a case-insensitive `find` — the file on disk is `Blast.md`. Also noted a sibling folder `Chapter07_AI_Agent/` with its own `Blast.MD`; deliberately left untouched, since the instruction was to use only the `_Claude` folder.
**Result:** Protocol understood. Two constraints drive everything that follows: (1) four memory files must exist before anything else, (2) writing into `tools/` is *forbidden* until Discovery is answered, the schema is defined in `llm.md`, and the Blueprint is approved.
**Next:** Look for prior art before inventing a Jira fetch layer.

---

### [2026-08-30 07:28] Protocol 0 — Recovered prior art from git history
**Did:** Recalled from the repo's git status that `QA_Skills/test-plan-creator/scripts/fetch_jira.sh` was deleted in the working tree, so retrieved it from HEAD with `git show HEAD:QA_Skills/.claude/test-plan-creator/scripts/fetch_jira.sh`.
**Error:** The file is not readable from disk — it is staged as deleted (`D`) along with the rest of the `QA_Skills/` import. Reading it directly would have failed; `git show` was the correct route.
**Result:** Recovered a working `curl + jq` precedent against `/rest/api/3/issue/{KEY}` with a field list that someone had already validated as sufficient for a test plan: `summary, description, issuetype, priority, components, labels, fixVersions, issuelinks, attachment`. Adopted that field list as our starting point (see `findings.md` F-02) rather than inventing one. Also identified its three gaps to fix: no error handling, no ADF flattening, no caching.
**Next:** Write up the Jira API research, including the exact requests, into `findings.md`.

---

### [2026-08-30 07:31] Protocol 0 — Memory files created
**Did:** Created `task_plan.md` (phases, gates, goals/non-goals, definition of done), `findings.md` (F-01 through F-08 — Cloud vs Server fork, prior art, exact curl/Python requests, ADF handling, field-to-section mapping, rate limits, failure modes), `progress.md` (this file), and `llm.md` (the Project Constitution — schemas, behavioural rules, architectural invariants).
**Error:** First attempt to write `findings.md` via a Bash heredoc failed with `unexpected EOF while looking for matching quote` — the document's own embedded quoting confused the shell. Switched to the Write tool for that file instead of fighting the escaping. No data lost; the file was never partially written.
**Result:** All four Protocol 0 artifacts exist in `Chapter07_AI_Agent_Claude/`. `tools/` deliberately does **not** exist yet and will not until the gates clear.
**Next:** Put the 5 Discovery Questions to the user. Execution halts here — this is the protocol's mandated stop, not a lack of things to do.

---

### [2026-08-30 07:33] Protocol 0 — HALT at the Blueprint gate
**Did:** Stopped. Asked the 5 Discovery Questions (North Star, Integrations, Source of Truth, Delivery Payload, Behavioural Rules), plus the specific blocker: is the target Jira **Cloud** or **Server/DC**?
**Error:** None. This is a deliberate stop, not a failure.
**Result:** Blocked, by design, on five answers. The one that gates the most code is Cloud vs Server — it decides `/rest/api/3` + ADF versus `/rest/api/2` + wiki markup, and therefore the entire normalization tool. Second blocker: whether real credentials exist now, or whether Phase 2 "Link" has to be built against a recorded fixture.
**Next (once answered):** Lock the `TestPlan` schema in `llm.md` → get Blueprint approval → only then Phase 2 (L — Link): `.env.example`, then `tools/verify_link.py` hitting `/myself`, then one real ticket fetched end-to-end into `.tmp/`.

---

### [2026-08-30 08:05] Blueprint — Discovery answered, gates cleared
**Did:** User supplied the answers and authorized the build: delivery is a **lightweight React app** with a Settings dialog (Jira base URL / email / token, Groq key), Groq model `openai/gpt-oss-120b` (free), primary test key `VWO-48`, and a second source — the local PRD at `Chapter01_Anti_Hallucination/PRD_24568`. Read the PRD: three numbered behaviour changes around active/inactive suppression filters in DataOps → Request → Filter selection.
**Error:** The prompt referenced `@chapter_03_BLAST_FW/B.L.A.S.T.md`, which does not exist. `find -iname "*BLAST*"` turned up only two copies of the file, `Chapter07_AI_Agent/Blast.MD` and `Chapter07_AI_Agent_Claude/Blast.md` — `diff` confirms they are byte-identical, so the protocol I already had was the right one. Proceeded rather than blocking on a path typo.
**Result:** Protocol 0 gates cleared. `tools/` unlocked.
**Next:** Phase 2 (Link) and Phase 3 (Architect), together, since the app needs both.

---

### [2026-08-30 08:12] Architect — key design decision: the app needs a server
**Did:** Established before writing UI code that a browser-only React app cannot work here. Jira Cloud sends no CORS headers for Basic auth, so a direct `fetch` from the page fails no matter how it is written; Groq blocks browser origins too. And an API token is a full-account credential that must never be shipped into browser JavaScript.
**Error:** None — this was caught at design time rather than after building a broken UI.
**Result:** Architecture is Vite + React on :5173 talking to a thin Express proxy on :8787. The proxy holds credentials and doubles as the Navigation layer (Layer 2). Recorded in `README.md` under "Why there is a server".
**Next:** Build the four SOPs and the tools they describe.

---

### [2026-08-30 08:40] Architect — Layers 1 and 3 built
**Did:** Wrote SOPs `architecture/01_fetch_jira.md` … `04_render_output.md`, then the tools they specify: `fetchJira.js` (REST + typed error envelopes), `adfToMarkdown.js` (ADF tree walker), `normalizeIssue.js`, `loadPrd.js`, `generatePlan.js` (the one probabilistic step), `renderPlan.js`. Navigation in `server/index.js`; React UI in `src/`.
**Error:** None at this stage.
**Result:** Ran the server and hit it with curl. `/api/health` and `/api/prd` returned correctly; PRD parsed into 3 sections and a clean `description_md`. Error paths verified by hand: `BAD_KEY`, `BAD_BASE_URL`, `GROQ_NO_KEY` all returned the right code, message and hint.
**Next:** Fix a quality problem visible in the PRD output.

---

### [2026-08-30 08:44] Architect — PRD parser was emitting untestable fragments
**Did:** First PRD run produced 9 "acceptance criteria", two of which were lead-in fragments — `"Edit Request Behavior: When editing an existing request:"`. Those are headers for the lines beneath them, not criteria; handing them to the model as requirements invites padding. Added a filter dropping body lines that end in a colon, keeping them in the prose.
**Error:** After the fix the count was still 9. Cause: `pkill -f "node server/index.js"` silently did nothing on Windows, the old process kept port 8787, the new one died with `EADDRINUSE`, and **I was testing stale code without realising it**. Only checking the server log revealed it. Killed the listener properly via PowerShell `Get-NetTCPConnection`.
**Result:** 9 → 7 clean, individually testable criteria. Lesson recorded: on Windows, verify a restart actually took rather than assuming the kill worked.
**Next:** Write the offline test suite.

---

### [2026-08-30 08:55] Architect — 24 offline tests, all passing
**Did:** `tests/offline.test.js` (15) covers the ADF walker (marks, links, heading demotion, lists, tables, HTML fallback, Jira Server strings, unknown nodes), AC extraction, `normalizeIssue`, PRD parsing, schema validation and rendering. `tests/generate.test.js` (9) stubs `globalThis.fetch` to exercise the generative step's fence: id sealing, traceability renumbering, **the R-01 gap being inserted in code when the model omits it**, fence stripping, the single retry feeding validation errors back, the hard-fail after a second invalid response, and an assertion that raw Jira JSON never reaches the prompt.
**Error:** `node --test tests/` failed with `MODULE_NOT_FOUND` on this Node build — it wanted explicit file paths, not a directory. Pointed the `test` script at the two files.
**Result:** 24/24 pass, zero network. llm.md I-07 satisfied.
**Next:** Verify the UI actually renders.

---

### [2026-08-30 09:05] Stylize — the build lied; running it caught a real bug
**Did:** `npm run build` succeeded cleanly (24 modules, 154 kB). Started the dev server and drove the page with Playwright rather than trusting the green build.
**Error:** The page was **blank** — `ReferenceError: React is not defined`, five console errors. Cause: `vite.config.js` imported `@vitejs/plugin-react` but never put it in `plugins: []`, so JSX compiled without the automatic runtime. **A passing build is not a working app** — the bundle built fine and was broken. This is the entry most worth keeping in this log.
**Result:** Added `plugins: [react()]`. Re-ran: page renders, title correct, `VWO-48` prefilled, the unconfigured state correctly blocks the run button and shows the warning. Opened Settings — both sections render, model prefilled with `openai/gpt-oss-120b`, both Test-connection buttons present.
**Next:** Clean up artifacts and report honestly on what remains unverified.

---

### [2026-08-30 09:15] Status — what is verified and what is not
**Did:** Removed screenshots and temp logs, stopped both dev servers, wrote `README.md`.
**Error:** None.
**Result — verified by running it:** PRD source end-to-end through normalization; all Jira and Groq error envelopes; 24 offline tests; production build; UI render and Settings dialog.
**Result — NOT verified, and cannot be from here:** the live Groq call and the live Jira fetch of `VWO-48`. Both need real credentials, which I do not have. The Groq path is covered by stubbed tests at the boundary, but no real `openai/gpt-oss-120b` response has been through this code. The first real run should be treated as the actual Phase 2 "Link" gate.
**Next:** User adds credentials in Settings, clicks both Test-connection buttons, then runs `VWO-48`. Log the outcome here.

---

### [2026-08-30 09:30] Link — the real gate finally cleared, using Chapter03's credentials
**Did:** User pointed at `Chapter03_Local_TestcaseGenerator/src/config/settings.json`, which already holds working Jira and Groq credentials. Ran both handshakes against them.
**Error:** None.
**Result:** Jira `200` as `kothagundlasudheer`; Groq `200` with `openai/gpt-oss-120b` confirmed present (14 models on the key). **Phase 2 is now genuinely closed**, not just structurally.
**Next:** Fetch the target ticket.

---

### [2026-08-30 09:34] Link — neither VWO-48 nor ZXD-24568 exists; the real ticket is KAN-6
**Did:** `VWO-48` returned `JIRA_404`. Listed projects: only `KAN` (AI4X) and `SAM1` exist — there is no VWO project. User then said the key was `ZXD-24568`; that 404'd too. Listed issues per project and found **KAN-6, "DataOps:Request-> show only the active requests"** — the same content as `PRD_24568`. User confirmed: use KAN-6.
**Error:** Two dead-end keys, plus a genuine API discovery: `/rest/api/3/search` **has been removed** by Atlassian (CHANGE-2046) in favour of `/rest/api/3/search/jql`, which additionally refuses unbounded JQL. `findings.md` F-03 documented the old endpoint and was wrong. Our own code never used `/search`, so the app was unaffected — but the research note was stale. Corrected.
**Result:** Target is KAN-6. Default key in the UI changed from VWO-48 to KAN-6.
**Next:** Normalize it and look hard at the output.

---

### [2026-08-30 09:40] Architect — R-01 false positive caught on a real ticket
**Did:** KAN-6 normalized cleanly — the ADF walker handled bold marks, nested bullets and the numbered sections correctly. But it reported **2 acceptance criteria** on a ticket that has no AC section. Inspected them: `"When editing an existing request:"` and `"When duplicating an existing request:"`.
**Error:** My Given/When/Then fallback was matching **lead-in fragments** — lines that introduce the bullets beneath them. This is precisely the failure R-01 exists to prevent, inverted: rather than inventing criteria, the extractor was *promoting non-criteria into criteria*, which would make the plan assert the ticket stated requirements it never stated **and suppress the high-severity gap**. A synthetic fixture would not have caught this; only a real ticket did.
**Result:** Fallback now skips any Given/When/Then line ending in a colon, and strips bold markers before matching. KAN-6 now correctly reports **0 AC**, and the plan raises the missing-AC gap. Regression test added naming the ticket.
**Next:** Run the generative step for real.

---

### [2026-08-30 09:48] Link — two real Groq free-tier limits, both now handled
**Did:** First live generation attempt.
**Error:** (1) **HTTP 413** — "Limit 8000, Requested 9037". The free tier's tokens-per-minute ceiling counts the *reserved* `max_completion_tokens`, not just what gets generated, so my 8000 budget alone blew the 8000 TPM limit before the model ran. Cut to 5000 and added a dedicated `GROQ_413` hint. (2) **HTTP 429** on the retry, with "try again in 41.6s". `findings.md` F-06 had already flagged that we should honour `Retry-After`; implemented it — one automatic wait, reading the header and falling back to parsing the delay out of the body, capped at 70s.
**Result:** Generation succeeded: KAN-6 → 3 scenarios, 1 gap, 2 attempts, 4.9s. The 429 backoff was then observed working live (waited 43s, then succeeded).
**Next:** Investigate why it needed 2 attempts.

---

### [2026-08-30 09:55] Architect — a prompt bug that was costing a wasted call every run
**Did:** Added the validation errors to the server log rather than guessing. Every scenario was failing `type` validation on attempt 1, on every run.
**Error:** **My bug, in the prompt.** The schema block interpolated `JSON.stringify(TYPES)`, rendering as `"type": ["functional","negative",…]` — a JSON **array literal**. The model read that as "type is this array" and returned an array. So each run silently paid for a full retry against an already-tight token budget. Changed to a string union, `"functional"|"negative"|…`, matching how `priority` was already written.
**Result:** **1 attempt instead of 2.** Token use per run roughly halved, and the plan improved from 3 scenarios to 5 — the retry had been truncating the model's work.
**Next:** Wire the credentials into the app itself and verify in the browser.

---

### [2026-08-30 10:05] Stylize — UI trimmed to one source, and a state bug found by using it
**Did:** Per user request, removed the Local-PRD toggle so there is a single Jira source. Added `GET /api/defaults`, which reads Chapter03's `settings.json` and prefills Settings — filling blanks only, so anything typed by hand wins. The token is read from where it already lives rather than being copied into this project, which keeps it one step further from an accidental commit.
**Error:** The first browser run failed with `BAD_KEY — "" is not a Jira issue key`, and the user hit the same thing. Cause: `load()` did `{ ...DEFAULTS, ...stored }`, so an **empty string** left in `localStorage` by an earlier build overrode a perfectly good default. Fixed to skip empty and null stored values. Reproduced the bad state deliberately in the browser, reloaded, and confirmed it now recovers to `KAN-6`.
**Result:** Verified live in the browser: both steps green, KAN-6 fetched, plan generated in 2.9s, gap panel showing the missing AC, scenarios rendering with preconditions/steps/expected/derived-from, **Save to output/** writing both files.
**Next:** Remove the now-dead PRD backend and finish.

---

### [2026-08-30 10:15] Done — final state
**Did:** Deleted the orphaned `loadPrd.js`, `/api/prd`, its test and its SOP section, since the UI no longer exposes that source. Updated the SOPs and README to match.
**Error:** None.
**Result — verified end to end:** 24/24 offline tests; clean production build; server boots clean; live Jira handshake; live Groq handshake; live KAN-6 fetch → normalize → generate → render → save, driven through the actual UI. `git status` confirms no credential file is tracked; `.env`, `.tmp/`, `dist/` and `node_modules/` are all ignored.
**Known limits:** Groq's free tier is 8000 TPM, so a much larger ticket than KAN-6 may still trip the limit — the app now waits once and retries rather than failing. Jira Server/DC (`/rest/api/2`, wiki markup) remains untested; the ADF walker passes strings through, so it should degrade gracefully, but that is reasoning, not evidence.

---

### [2026-08-30 10:40] Blueprint — CORRECTION: I built the wrong artifact
**Did:** User said the output should be a test plan "like below link, not the testcases", pointing at a Google Doc.
**Error:** **The Google Doc is private — WebFetch returned only the Docs chrome, no content.** Rather than guessing at the structure, searched the repo and found what is almost certainly the same document: `QA_Skills/.claude/test-plan-creator/references/template/Test_Plan_Template.md` in git history — a 14-section template credited to Pramod Dutta. Also recovered `requirement-checklist.md`, a gap-analysis checklist, from the same place.
**Result — the substantive finding:** schema v1.0 was producing **test cases**, not a test plan. Scenarios with preconditions, numbered steps and expected results. That is a different deliverable. In the real template, "Test Scenarios" and "Test Cases" appear in §9 as **deliverables the plan authorizes** — things written *after* the plan is approved, not content of it. I had built a plausible artifact that answered the wrong question, and had verified it thoroughly, which is its own lesson: passing tests confirm the thing works, not that it is the right thing.
**Next:** Rebuild around the real template.

---

### [2026-08-30 10:55] Architect — schema v2.0, and a cleaner split of responsibilities
**Did:** Rewrote `generatePlan.js` and `renderPlan.js` around the 14 sections. The rework surfaced a distinction worth more than the section list itself:

- **Ticket-derived content** — objective, features, scope, environment, strategy, risks, gaps — is genuinely per-ticket and is what the model produces.
- **Process boilerplate** — defect lifecycle, severity and priority scales, deliverable list, schedule activities, roles, approval table — is fixed organizational standard, now emitted from constants in the renderer.

Asking a model to restate a fixed process is how process drift gets introduced: the severity definitions would quietly differ between two plans. So it no longer does. This sharpens I-01 — the LLM's one job got smaller and better defined.

Folded the recovered requirement checklist into the prompt as the gap-analysis framework, and required every gap to carry a `question_for_author` phrased to be pasted into a Jira comment unchanged.
**Error:** `server/index.js` still logged `plan.scenarios.length` and crashed the first run with `Cannot read properties of undefined`. Caught immediately because the run was real rather than mocked.
**Result:** 38 tests passing (up from 24), including assertions that the document contains **no** step-by-step steps or expected-results — the wrong-artifact mistake now has a regression test.
**Next:** Run it and read the output critically.

---

### [2026-08-30 11:05] Stylize — two defects found by reading the generated document
**Did:** Generated the plan for KAN-6 and read all 15 sections rather than just checking it rendered.
**Error:** (1) **Every "out of scope" item was labelled `source: description`.** The ticket never says performance testing is excluded — the model concluded that. Labelling an inference as a ticket statement is an R-02 violation, and a reviewer would have taken it as the reporter's decision. Tightened the prompt: *silence is not a statement*; `scope_out[].source` is almost always `"inferred"`. (2) My own boilerplate referenced "Open questions from §2" when the gaps table is §3 — an off-by-one I introduced when gaps moved.
**Result:** Re-ran: `scope_out` now reads `inferred, inferred, inferred, inferred, inferred`, and `scope_in` an honest mix of `description, description, inferred, inferred`. Section reference corrected.
**Next:** Final verification.

---

### [2026-08-30 11:15] Done — v2.0 verified end to end
**Did:** Ran the whole thing through the real browser against live Jira and Groq.
**Error:** None.
**Result:** KAN-6 → 3 features, 4 in scope, 2 risks, **8 gaps (2 high)**, 1 attempt, 4.7s. All 15 sections present in the saved file; zero step-by-step cases. Gap questions are specific and pasteable ("Which test environment should be used for executing these tests (e.g., dev, QA) and are there any feature flags to enable?"). 38/38 tests pass; clean build; `git status` shows no credential file tracked.
**Standing limits:** Groq free tier is 8000 TPM — a much larger ticket may still trip it, though the app now waits and retries once. No PDF output; the template's native form is a document, we emit Markdown. Jira Server/DC still untested.

---

<!-- Append new entries below this line. Do not edit entries above; correct them with a new entry. -->
