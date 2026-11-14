# LLM Constitution — Jira ID to Test Plan Creator

## Purpose and decision rationale

The system should use deterministic code for retrieval, access control, parsing, validation, and delivery. The LLM's limited role is to interpret approved Jira evidence and draft test coverage. This separation makes the result auditable and prevents the model from deciding what data it may access or fabricating requirements.

## Proposed data schemas

### Input: `TestPlanRequest`

```json
{
  "request_id": "uuid",
  "jira_issue_key": "PROJECT-123",
  "source_policy": {
    "include_description": true,
    "include_acceptance_criteria": true,
    "include_linked_issues": false,
    "include_comments": false,
    "include_attachments": false
  },
  "output_format": "markdown",
  "delivery_target": "local_review",
  "requested_by": "optional-redacted-identifier"
}
```

### Normalized evidence: `JiraIssueEvidence`

```json
{
  "issue_key": "PROJECT-123",
  "source_url": "https://jira.example.com/browse/PROJECT-123",
  "summary": "string",
  "issue_type": "string",
  "status": "string",
  "priority": "string|null",
  "description": "string|null",
  "acceptance_criteria": ["string"],
  "labels": ["string"],
  "components": ["string"],
  "linked_items": [{"key": "string", "relationship": "string", "summary": "string"}],
  "source_references": [{"field": "string", "reference": "string"}],
  "retrieved_at": "ISO-8601 timestamp"
}
```

### Output: `TestPlan`

```json
{
  "request_id": "uuid",
  "jira_issue_key": "PROJECT-123",
  "title": "string",
  "objective": "string",
  "scope_in": ["string"],
  "scope_out": ["string"],
  "assumptions": ["string"],
  "risks": ["string"],
  "open_questions": ["string"],
  "test_scenarios": [
    {
      "id": "TS-001",
      "title": "string",
      "priority": "critical|high|medium|low",
      "type": "functional|negative|boundary|integration|security|accessibility|performance|regression",
      "preconditions": ["string"],
      "steps": ["string"],
      "expected_results": ["string"],
      "traceability": ["Jira field or acceptance-criterion reference"],
      "confidence": "supported|inferred|blocked"
    }
  ],
  "coverage_gaps": ["string"],
  "generated_at": "ISO-8601 timestamp",
  "review_status": "draft"
}
```

## Behavioral rules

1. Treat the normalized Jira evidence as the sole source for requirements unless an approved source policy adds another source.
2. Do not invent acceptance criteria, APIs, UI behavior, data values, environments, permissions, or business rules. Put uncertainty in `open_questions` or mark the item `inferred`.
3. Every scenario must include at least one traceability reference. Unsupported scenarios are excluded or explicitly marked `blocked`.
4. Use concise, executable test language: preconditions, steps, and observable expected results.
5. Consider relevant coverage categories, but include them only when evidence or a clearly marked risk justifies them.
6. Never expose secrets or reproduce sensitive attachment/comment content outside the approved destination.
7. Do not execute tests, update Jira, send notifications, or make delivery-side changes without explicit approval and a deterministic tool action.
8. Treat all output as `draft` until a human reviewer approves it.

## A.N.T. architecture

| Layer | Responsibility | Invariants |
| --- | --- | --- |
| Architecture | Markdown SOPs defining approved sources, transformations, errors, and acceptance checks. | Update SOPs before changing logic. |
| Navigation | Orchestrates validation, retrieval, normalization, LLM drafting, schema validation, and review routing. | It cannot bypass approval gates or expand source scope. |
| Tools | Atomic code for Jira requests, field normalization, schema validation, rendering, and delivery. | Deterministic, testable, redacted logs, secrets from `.env`, temporary files in `.tmp/`. |

## Processing flow

`validate request → retrieve approved Jira fields → normalize evidence → validate evidence → LLM drafts plan → validate TestPlan schema and traceability → render → human review → approved delivery`

## Error policy

- Invalid issue key: return a validation error before any network request.
- 401/403/404/429/5xx: return a safe error code and retry guidance where appropriate; do not create a plan from absent evidence.
- Missing acceptance criteria or description: produce a limited draft with explicit open questions, or stop if the confirmed rules require acceptance criteria.
- Schema or traceability validation failure: reject the draft and request regeneration/repair; never silently drop invalid items.

## Approval gate

This proposal is not final until the user confirms the Jira source fields, delivery target, behavioral rules, and JSON shapes. Until then, implementation remains halted under Protocol 0.
