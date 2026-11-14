# SOP 02 — Normalize the issue

**Layer 1 (Architecture).**
**Implements:** `server/tools/normalizeIssue.js`, `server/tools/adfToMarkdown.js`
**Output schema:** `llm.md` §3.1 `NormalizedIssue`

---

## Goal

Produce the **only** object the LLM is ever allowed to see. Raw Jira JSON never reaches the model.

Two reasons this is a hard boundary:
1. **Cost and quality.** ADF is a deeply nested JSON tree. Feeding it raw burns tokens on scaffolding and makes tables read as noise.
2. **Control.** If the model only ever sees a shape we define, we can reason about what it can and cannot know. That is what makes rule R-01 enforceable.

## ADF → Markdown

Jira Cloud's `description` is a document tree, not a string:

```json
{"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "…"}]}]}
```

`adfToMarkdown.js` walks it. Handled node types:

- Inline: `text` (with `strong`/`em`/`code`/`strike`/`link` marks), `hardBreak`, `mention`, `emoji`, `inlineCard`, `status`, `date`
- Block: `paragraph`, `heading`, `bulletList`, `orderedList`, `taskList`, `codeBlock`, `blockquote`, `panel`, `rule`, `table`, `mediaSingle`, `expand`

Decisions worth recording:

- **Headings are demoted by one level.** A ticket's `h1` becomes `##` so it nests under the plan's own `#` title instead of competing with it.
- **Table cells are flattened.** Cells nest paragraphs; their inline content is pulled up so a cell renders on one Markdown line rather than breaking the table.
- **Unknown node types recurse into `content`** rather than being dropped. An unrecognized wrapper should lose its formatting, not its text.
- **Fallback order:** ADF tree → `renderedFields` HTML → empty string. A string `description` (Jira Server sends wiki markup) passes through untouched.

## Acceptance criteria extraction

This is the part R-01 lives or dies on, so it is deterministic code, never a model call.

1. Find a heading matching `acceptance criteria | AC | success criteria | definition of done | DoD`.
2. Take the bullet run that follows it. Stop at the next heading, or at prose after the bullets.
3. If that finds nothing, fall back to `Given/When/Then` lines anywhere in the description — those are explicit criteria regardless of where they sit.
4. If *still* nothing, look through the comments, and when AC come from there, record `ac_source` as the commenter's name. Comments are a weaker authority than the description and the plan must say so.
5. **If nothing is found anywhere, return `[]`.** Never guess. The downstream prompt is then told, in as many words, that none were stated and that it must record a gap.

## Edge cases

| Condition | Behaviour |
|---|---|
| empty description | `description_md: ""` — downstream treats this as a gap |
| ADF present but renders empty | fall back to `renderedFields` HTML |
| Jira Server (string description) | passed through as-is |
| link with no `outwardIssue`/`inwardIssue` | dropped |
| missing `priority`/`assignee` | `"Unset"` / `null`, never fabricated |
