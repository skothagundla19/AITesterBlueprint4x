// Layer 3 / Tool: raw Jira JSON -> NormalizedIssue (llm.md §3.1). Deterministic.
// SOP: architecture/02_normalize_issue.md
//
// This is the only thing the LLM is ever allowed to see. Raw Jira JSON never reaches it.

import { adfToMarkdown, htmlToText } from './adfToMarkdown.js'

const AC_HEADING = /^\s*#{0,6}\s*\**\s*(acceptance\s*criteria|ac|success\s*criteria|definition\s*of\s*done|dod)\b\s*:?\**\s*$/i
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/

/**
 * Pull acceptance criteria out of Markdown, deterministically.
 * Rule R-01: if the ticket does not state AC, this returns []. It never guesses.
 * Strategy: find an AC heading, take the bullet run that follows it, stop at the next heading.
 */
export function extractAcceptanceCriteria(md = '') {
  const lines = md.split('\n')
  const out = []
  let inside = false
  for (const line of lines) {
    if (AC_HEADING.test(line)) { inside = true; continue }
    if (!inside) continue
    if (/^\s*#{1,6}\s+\S/.test(line)) break        // next heading ends the section
    const m = line.match(BULLET)
    if (m) { out.push(m[1]); continue }
    if (line.trim() === '') continue                // blank lines inside the run are fine
    if (out.length) break                           // prose after the bullets ends the run
  }
  // "Given/When/Then" lines outside a heading are also explicit AC, not inference.
  //
  // But a Given/When/Then line ending in a colon is a LEAD-IN to the lines beneath it
  // ("When editing an existing request:"), not a criterion. Counting those as acceptance
  // criteria is worse than finding none at all: it makes the plan claim the ticket stated
  // criteria it never stated, and it suppresses the high-severity gap that R-01 requires.
  // Caught on a real ticket (KAN-6) — see progress.md.
  if (out.length === 0) {
    for (const line of lines) {
      const m = line.match(BULLET)
      const text = (m ? m[1] : line.trim()).replace(/\*\*/g, '').trim()
      if (!/^(given|when|then)\b/i.test(text)) continue
      if (/:\s*$/.test(text)) continue          // lead-in, not a criterion
      if (text.length <= 12) continue
      out.push(text)
    }
  }
  return out
}

const names = (arr) => (arr ?? []).map((x) => x?.name).filter(Boolean)

export function normalizeIssue({ issue, comments = [], baseUrl }) {
  const f = issue.fields ?? {}
  const rendered = issue.renderedFields ?? {}

  const description_md = adfToMarkdown(f.description, rendered.description ?? '')

  const commentList = comments.map((c) => ({
    author: c.author?.displayName ?? 'unknown',
    created: c.created,
    body_md: adfToMarkdown(c.body, c.renderedBody ?? ''),
  })).filter((c) => c.body_md)

  // AC come from the description first. Only if the description has none do we look in
  // comments — and when they come from there we say so, because that is a weaker source.
  let acceptance_criteria = extractAcceptanceCriteria(description_md)
  let ac_source = acceptance_criteria.length ? 'description' : null
  if (!acceptance_criteria.length) {
    for (const c of commentList) {
      const found = extractAcceptanceCriteria(c.body_md)
      if (found.length) { acceptance_criteria = found; ac_source = `comment by ${c.author}`; break }
    }
  }

  return {
    source: 'jira',
    key: issue.key,
    url: `${baseUrl}/browse/${issue.key}`,
    summary: f.summary ?? '',
    issue_type: f.issuetype?.name ?? 'Unknown',
    status: f.status?.name ?? 'Unknown',
    priority: f.priority?.name ?? 'Unset',
    assignee: f.assignee?.displayName ?? null,
    reporter: f.reporter?.displayName ?? null,
    components: names(f.components),
    labels: f.labels ?? [],
    fix_versions: names(f.fixVersions),
    due_date: f.duedate ?? null,
    parent: f.parent ? { key: f.parent.key, summary: f.parent.fields?.summary ?? '' } : null,
    subtasks: (f.subtasks ?? []).map((s) => ({
      key: s.key, summary: s.fields?.summary ?? '', status: s.fields?.status?.name ?? '',
    })),
    links: (f.issuelinks ?? []).map((l) => {
      const other = l.outwardIssue ?? l.inwardIssue
      if (!other) return null
      return {
        type: l.outwardIssue ? l.type?.outward : l.type?.inward,
        key: other.key,
        summary: other.fields?.summary ?? '',
      }
    }).filter(Boolean),
    attachments: (f.attachment ?? []).map((a) => ({
      filename: a.filename, mime: a.mimeType, size: a.size,
    })),
    description_md,
    acceptance_criteria,
    ac_source,
    comments: commentList,
    fetched_at: new Date().toISOString(),
    source_updated_at: f.updated ?? null,
  }
}

export { htmlToText }
