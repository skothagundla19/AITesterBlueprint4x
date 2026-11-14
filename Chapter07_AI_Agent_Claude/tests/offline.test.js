// Offline tests. llm.md I-07: no network. Run with `node --test tests/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { adfToMarkdown } from '../server/tools/adfToMarkdown.js'
import { extractAcceptanceCriteria, normalizeIssue } from '../server/tools/normalizeIssue.js'
import { validateTestPlan } from '../server/tools/generatePlan.js'
import { renderMarkdown } from '../server/tools/renderPlan.js'

// --- ADF -> Markdown ------------------------------------------------------------

const ADF = {
  type: 'doc', version: 1, content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Context' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Only ' },
      { type: 'text', text: 'active', marks: [{ type: 'strong' }] },
      { type: 'text', text: ' filters show. ' },
      { type: 'text', text: 'spec', marks: [{ type: 'link', attrs: { href: 'https://x/spec' } }] },
    ] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Acceptance Criteria' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inactive filters are hidden' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edit screen still shows an inactive filter' }] }] },
    ] },
    { type: 'table', content: [
      { type: 'tableRow', content: [
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'State' }] }] },
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] }] },
      ] },
      { type: 'tableRow', content: [
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Active' }] }] },
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'yes' }] }] },
      ] },
    ] },
  ],
}

test('adfToMarkdown: marks, links, headings, lists, tables', () => {
  const md = adfToMarkdown(ADF)
  assert.match(md, /\*\*active\*\*/, 'strong mark')
  assert.match(md, /\[spec\]\(https:\/\/x\/spec\)/, 'link mark')
  assert.match(md, /^## Context$/m, 'h1 demoted to h2')
  assert.match(md, /^- Inactive filters are hidden$/m, 'bullet list')
  assert.match(md, /\| State \| Visible \|/, 'table header')
  assert.match(md, /\| --- \| --- \|/, 'table separator')
})

test('adfToMarkdown: falls back to renderedFields HTML when ADF is empty', () => {
  assert.equal(adfToMarkdown(null, '<p>Hello <b>there</b></p>'), 'Hello there')
})

test('adfToMarkdown: Jira Server string description passes through', () => {
  assert.equal(adfToMarkdown('plain wiki text'), 'plain wiki text')
})

test('adfToMarkdown: unknown node types keep their text', () => {
  const md = adfToMarkdown({ type: 'doc', content: [
    { type: 'someFutureNode', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'kept' }] }] },
  ] })
  assert.match(md, /kept/)
})

// --- acceptance criteria extraction (rule R-01) ----------------------------------

test('extractAcceptanceCriteria: finds the bullet run under an AC heading', () => {
  const ac = extractAcceptanceCriteria(adfToMarkdown(ADF))
  assert.deepEqual(ac, ['Inactive filters are hidden', 'Edit screen still shows an inactive filter'])
})

test('extractAcceptanceCriteria: returns [] rather than guessing', () => {
  assert.deepEqual(extractAcceptanceCriteria('Just a sentence about filters. Nothing structured.'), [])
})

test('extractAcceptanceCriteria: picks up Given/When/Then without a heading', () => {
  const ac = extractAcceptanceCriteria('- Given a request with an inactive filter\n- Then an error popup appears')
  assert.equal(ac.length, 2)
})

// Regression: found on the real ticket KAN-6. The Given/When/Then fallback was matching
// "When editing an existing request:" — a lead-in to the bullets below it, not a criterion.
// Claiming those as stated AC is worse than finding none: it suppresses the R-01 gap.
test('extractAcceptanceCriteria: a Given/When/Then lead-in ending in ":" is not a criterion', () => {
  const md = [
    '**#2 Edit Request Behavior**',
    'When editing an existing request:',
    '',
    '- If the selected filter has become Inactive, it should still be displayed.',
  ].join('\n')
  assert.deepEqual(extractAcceptanceCriteria(md), [],
    'no AC heading and only a lead-in means none are stated')
})

test('extractAcceptanceCriteria: stops at the next heading', () => {
  const ac = extractAcceptanceCriteria('## Acceptance Criteria\n- one\n- two\n## Notes\n- not an AC')
  assert.deepEqual(ac, ['one', 'two'])
})

// --- normalizeIssue --------------------------------------------------------------

test('normalizeIssue: maps Jira fields and never fabricates missing ones', () => {
  const issue = normalizeIssue({
    baseUrl: 'https://acme.atlassian.net',
    issue: {
      key: 'VWO-48',
      fields: {
        summary: 'Hide inactive filters',
        description: ADF,
        issuetype: { name: 'Story' },
        status: { name: 'In Progress' },
        priority: null,                       // deliberately absent
        components: [{ name: 'DataOps' }],
        labels: ['filters'],
        issuelinks: [{ type: { outward: 'blocks' }, outwardIssue: { key: 'VWO-90', fields: { summary: 'API' } } }],
        updated: '2026-08-29T10:00:00.000+0000',
      },
    },
    comments: [],
  })
  assert.equal(issue.key, 'VWO-48')
  assert.equal(issue.url, 'https://acme.atlassian.net/browse/VWO-48')
  assert.equal(issue.priority, 'Unset')        // not invented
  assert.equal(issue.assignee, null)
  assert.equal(issue.acceptance_criteria.length, 2)
  assert.equal(issue.ac_source, 'description')
  assert.deepEqual(issue.links, [{ type: 'blocks', key: 'VWO-90', summary: 'API' }])
})

test('normalizeIssue: falls back to comments for AC and says where they came from', () => {
  const issue = normalizeIssue({
    baseUrl: 'https://acme.atlassian.net',
    issue: { key: 'VWO-49', fields: { summary: 'thin ticket', description: null } },
    comments: [{ author: { displayName: 'R. Eviewer' }, created: '2026-08-01',
      body: { type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Acceptance Criteria' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'must persist' }] }] },
        ] },
      ] } }],
  })
  assert.deepEqual(issue.acceptance_criteria, ['must persist'])
  assert.equal(issue.ac_source, 'comment by R. Eviewer')
})

// --- TestPlan validation (rule R-06) ---------------------------------------------

const VALID_PLAN = {
  objective: 'Verify that only active suppression filters are selectable.',
  features_to_test: [
    { feature: 'Filter dropdown', detail: 'Only active filters listed', priority: 'P1', source: 'description' },
  ],
  scope_in: [{ item: 'Functional Testing', source: 'description' }],
  scope_out: [{ item: 'Performance Testing', source: 'inferred' }],
  test_environment: { environments: [], platforms: [], browsers: [], test_data: [] },
  test_strategy: {
    design_techniques: [{ technique: 'Equivalence Partitioning', why: 'Active vs inactive classes' }],
    execution_phases: [{ phase: 'Functional Testing', focus: 'Dropdown and save paths' }],
  },
  entry_criteria: [], exit_criteria: [], assumptions: [],
  risks: [{ risk: 'Deep links break', mitigation: 'Regression pass', impact: 'high', likelihood: 'medium', source: 'inferred' }],
  gaps: [{ area: 'Environment', finding: 'No environment named.', question_for_author: 'Which environment?', severity: 'medium' }],
}

test('validateTestPlan: accepts a well-formed plan', () => {
  assert.deepEqual(validateTestPlan(structuredClone(VALID_PLAN)), [])
})

test('validateTestPlan: rejects bad enums and missing traceability', () => {
  const bad = structuredClone(VALID_PLAN)
  bad.features_to_test[0].priority = 'URGENT'
  delete bad.features_to_test[0].source
  bad.risks[0].impact = 'catastrophic'
  bad.gaps[0].severity = 'blocker'
  delete bad.gaps[0].question_for_author
  const errors = validateTestPlan(bad)
  assert.ok(errors.some((e) => /priority must be P1/.test(e)))
  assert.ok(errors.some((e) => /source missing/.test(e)))
  assert.ok(errors.some((e) => /impact/.test(e)))
  assert.ok(errors.some((e) => /severity/.test(e)))
  assert.ok(errors.some((e) => /question_for_author/.test(e)))
})

test('validateTestPlan: a plan with no features is invalid', () => {
  const bad = structuredClone(VALID_PLAN)
  bad.features_to_test = []
  assert.ok(validateTestPlan(bad).some((e) => /at least one/.test(e)))
})

test('validateTestPlan: a plan missing the nested objects is invalid', () => {
  const bad = structuredClone(VALID_PLAN)
  delete bad.test_environment
  delete bad.test_strategy
  const errors = validateTestPlan(bad)
  assert.ok(errors.some((e) => /test_environment must be an object/.test(e)))
  assert.ok(errors.some((e) => /test_strategy must be an object/.test(e)))
})

// --- rendering: the 14-section test plan document --------------------------------

const ISSUE = {
  key: 'KAN-6', summary: 'Show only the active requests', issue_type: 'Task',
  status: 'To Do', priority: 'Medium', components: ['DataOps'], labels: [],
  fix_versions: [], reporter: 'A. Reporter', assignee: null,
}

function render(overrides = {}) {
  const plan = { ...structuredClone(VALID_PLAN), ...overrides }
  Object.assign(plan, {
    issue_key: 'KAN-6', issue_url: 'https://acme.atlassian.net/browse/KAN-6',
    generated_at: '2026-08-30T00:00:00.000Z', model: 'openai/gpt-oss-120b',
  })
  return renderMarkdown(plan, ISSUE)
}

test('renderMarkdown: emits all 15 numbered sections of the template', () => {
  const md = render()
  const expected = [
    'Document Information', 'Objective', 'Gaps & Questions for the Author', 'Scope',
    'Features to be Tested', 'Test Environment', 'Test Strategy', 'Test Schedule',
    'Test Deliverables', 'Entry & Exit Criteria', 'Defect Management',
    'Risks & Mitigation', 'Roles & Responsibilities', 'Assumptions', 'Approvals',
  ]
  expected.forEach((title, i) => {
    assert.match(md, new RegExp(`^## ${i + 1}\. .*${title.replace(/[&]/g, '\&')}`, 'm'),
      `section ${i + 1} "${title}" missing`)
  })
})

test('renderMarkdown: it is a PLAN, not test cases — no steps or expected-results', () => {
  const md = render()
  assert.ok(!/^\*\*Steps\*\*/m.test(md), 'a test plan must not contain step-by-step cases')
  assert.ok(!/^\*\*Expected\*\*/m.test(md), 'a test plan must not contain expected results')
  assert.match(md, /Detailed test cases are a deliverable of this plan, not part of it/)
})

test('renderMarkdown: gaps come before scope and features', () => {
  const md = render()
  assert.ok(md.indexOf('Gaps & Questions') < md.indexOf('## 4. Scope'),
    'the reader must see what the ticket failed to say before what was built on it')
  assert.match(md, /Which environment\?/, 'the author question is rendered verbatim')
})

test('renderMarkdown: process boilerplate is supplied deterministically, not by the model', () => {
  const md = render()
  assert.match(md, /New → Assigned → In Progress → Fixed → Retest → Closed → Reopened/)
  assert.match(md, /\| Critical \| Blocks the feature/)
  assert.match(md, /Requirements Traceability Matrix/)
  assert.match(md, /\| Test Planning \| _TBD_ \| _TBD_ \| Not started \|/)
})

test('renderMarkdown: unstated facts are explicit blanks, never invented', () => {
  const md = render()
  assert.match(md, /Not stated in the source/, 'empty sections say so')
  assert.match(md, /The ticket names no environment or URL/)
  assert.match(md, /Dates and owners are not derivable from a Jira ticket/)
  assert.match(md, /_unassigned — to be confirmed_/, 'a null assignee is not filled in')
})

test('renderMarkdown: an inferred source is labelled as inference, a real one is cited', () => {
  const md = render()
  assert.match(md, /_inferred — not stated in the ticket_/)
  assert.match(md, /_source: description_/)
})

test('renderMarkdown: the review gate counts high-severity gaps', () => {
  const md = render({
    gaps: [
      { area: 'Acceptance criteria', finding: 'None stated.', question_for_author: 'What are the AC?', severity: 'high' },
      { area: 'Environment', finding: 'Not named.', question_for_author: 'Which env?', severity: 'low' },
    ],
  })
  assert.match(md, /1 High-severity gap\(s\) in §3/)
  assert.match(md, /Approve or edit this plan before writing test cases/)
})

test('renderMarkdown: a pipe in model output cannot break a table', () => {
  const md = render({
    features_to_test: [{ feature: 'A | B', detail: 'x | y', priority: 'P1', source: 'description' }],
  })
  assert.match(md, /A \\| B/, 'pipes are escaped so the table survives')
})
