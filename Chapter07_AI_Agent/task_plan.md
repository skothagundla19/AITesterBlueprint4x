# Task Plan — Jira ID to Test Plan Creator

## Protocol 0 status

**Status: initialized; execution halted.** This is the mandatory B.L.A.S.T. initialization phase. No code or files under `tools/` may be created until the discovery answers, input/output schema, and Blueprint approval are complete.

## North-star goal

Given a Jira issue key (for example, `PAY-123`), produce a reviewable, traceable test plan that turns the issue's requirements and linked context into test scenarios, test cases, assumptions, risks, and open questions.

## Success criteria

- [ ] A valid Jira issue key returns the intended issue, including its description and relevant fields.
- [ ] The generated plan explicitly traces every test item to a Jira field, acceptance criterion, or clearly labelled inference.
- [ ] Missing or ambiguous requirements become open questions; they are never silently invented.
- [ ] Functional, negative, boundary, integration, permission, regression, and non-functional coverage are considered where applicable.
- [ ] The output follows the confirmed JSON schema and agreed delivery format.
- [ ] Credentials remain in `.env` or a secret manager and never appear in logs, commits, plans, or generated output.

## Discovery questions requiring answers

1. **North Star:** Is the desired deliverable a human-reviewable Markdown plan, structured JSON for another system, test-management records, or more than one of these?
2. **Integrations:** Is Jira Cloud or Jira Data Center/Server in use? What is the base URL, and will authentication use an API token, OAuth, Personal Access Token, or another method?
3. **Source of truth:** Which Jira fields and linked objects are authoritative—description, acceptance criteria, comments, linked issues, attachments, Confluence pages, or a particular custom field?
4. **Delivery payload:** Where should a completed plan go—local file, Jira comment/attachment, Xray/Zephyr, Confluence, Slack, email, or a UI?
5. **Behavioral rules:** What test depth, product/domain constraints, preferred terminology, approval requirement, and explicit “do not” rules apply?

## Blueprint phases

### Phase 0 — Initialize (complete)

- [x] Read `Blast.MD`.
- [x] Create project memory documents.
- [x] Record the proposed data contract and guardrails.
- [x] Halt implementation pending discovery and Blueprint approval.

### Phase 1 — Blueprint (pending approval)

- [ ] Obtain answers to all five discovery questions.
- [ ] Confirm Jira deployment, auth approach, and available scopes.
- [ ] Confirm the authoritative Jira fields and link-expansion rules.
- [ ] Review and approve the input/output schema in `LLM.md`.
- [ ] Define acceptance criteria for a generated plan.
- [ ] Research approved project dependencies and Jira API version.
- [ ] Approve this Blueprint before connectivity or implementation begins.

### Phase 2 — Link (after approval)

- [ ] Add credentials only to `.env` (excluded from version control).
- [ ] Make a minimal authenticated Jira request for one permitted issue.
- [ ] Verify status handling, pagination, rate limits, and field permissions.
- [ ] Record only redacted connection results in `progress.md`.

### Phase 3 — Architect (after Link succeeds)

- [ ] Write the retrieval and generation SOP in `architecture/`.
- [ ] Implement atomic, deterministic retrieval/validation tools in `tools/`.
- [ ] Keep LLM work constrained to interpretation and draft generation.
- [ ] Validate all generated output against the approved schema.
- [ ] Add fixtures and tests for happy-path, missing-field, unauthorized, and ambiguous-ticket cases.

### Phase 4 — Stylize and deliver (after Architect)

- [ ] Render the agreed Markdown/JSON/test-management payload.
- [ ] Apply traceability labels, priorities, and readable grouping.
- [ ] Present a sample plan for review.
- [ ] Incorporate approved feedback before enabling delivery.

## Approval gate

Proceed beyond Protocol 0 only after the user confirms: (1) discovery answers, (2) the data schema in `LLM.md`, and (3) this Blueprint.
