// Layer 3 / Tool: the ONE probabilistic step in the whole system (llm.md I-01).
// SOP: architecture/03_generate_test_plan.md
//
// Input:  NormalizedIssue (never raw Jira JSON)
// Output: a schema-validated TestPlan object (llm.md §3.2)
//
// This produces a TEST PLAN — the planning document (objective, scope, strategy, environment,
// risks, entry/exit criteria) — NOT test cases. Step-by-step cases are a later deliverable,
// listed in §9 of the plan as something the plan authorizes, not something it contains.
//
// The model is asked only for the parts that describe THIS ticket. Everything that is
// organizational boilerplate — the defect lifecycle, severity scales, deliverable list,
// approval table — is supplied deterministically by the renderer from the template. Asking a
// model to restate a fixed process is how process drift gets introduced.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const LEVELS = ['high', 'medium', 'low']
const TEST_TYPES = [
  'Functional Testing', 'Integration Testing', 'Regression Testing', 'API Testing',
  'UI Testing', 'Performance Testing', 'Security Testing', 'Compatibility Testing',
  'Usability Testing', 'Data Validation', 'Error Handling', 'Boundary Testing',
  'Exploratory Testing', 'Accessibility Testing',
]
const TECHNIQUES = [
  'Equivalence Partitioning', 'Boundary Value Analysis', 'Decision Table Testing',
  'State Transition Testing', 'Use Case Testing', 'Error Guessing', 'Exploratory Testing',
]

// The prompt is the contract. R-01 ("never invent requirements") is stated several ways on
// purpose — it is the failure this project exists to prevent, and models drift toward
// helpfulness, toward filling a blank with something plausible.
const SYSTEM_PROMPT = `You are a senior QA lead writing a TEST PLAN for a single tracked requirement.

A test plan is a PLANNING document: what will be tested, why, how, in what environment, under
what risks, and when testing may start and stop. It is NOT a list of test cases. Do NOT write
step-by-step test steps or expected results — detailed cases are a separate deliverable that
this plan authorizes. Stay at the level of features, coverage areas and strategy.

You return ONE JSON object and nothing else. No prose, no markdown fence, no commentary.

HARD RULES — violating these makes the output worse than useless:

1. NEVER invent requirements or project facts. A Jira ticket does not contain schedule dates,
   staff names, environment URLs, tool choices or sign-off owners. If the source does not state
   something, you do NOT fill it in — you record it in "gaps". Fabricated plan content is
   indistinguishable from real content at review time, and someone will execute against it.
   Leaving a blank is the correct output. An empty "gaps" array on a thin ticket is itself a bug.

2. Separate what the ticket says from what you concluded. Every item carrying a "source" field
   must name where it came from: "description", "acceptance_criteria[1]", "components",
   "comment by X" — or the literal string "inferred" when you reasoned it out. Do not label an
   inference as though the ticket stated it.

3. Scope must be about THIS ticket. Do not list every test type in existence. Include a test
   type in scope_in only if this specific change actually warrants it, and say why in "source".
   Anything a reasonable reader might expect but the ticket does not justify goes in scope_out.

   IMPORTANT — scope_out."source" is almost always "inferred". A ticket that simply does not
   mention performance testing has NOT declared performance testing out of scope; you concluded
   that. Use "description" there ONLY when the ticket explicitly excludes something in words.
   The same applies everywhere: "source" names where a claim came from, and silence is not a
   statement.

4. Do not pad. A three-line ticket earns a short plan. Volume is not quality.

5. Write for a QA engineer who has not read the ticket. Direct, concrete, no filler, no marketing.

GAP ANALYSIS — score the requirement against this checklist and record every ⚠️/❌ in "gaps":
- Functional: testable acceptance criteria; happy path; negative/error paths; boundary and
  empty states; state transitions
- Data & environment: test data specified; environment/config/feature flags named; external
  dependencies; preconditions
- Non-functional (usually missing): performance, security/authorization, accessibility,
  internationalization, audit/logging
- Cross-cutting: regression surface, backward compatibility, browser/mobile matrix, rollback
- Clarity: ambiguous wording ("should", "etc.", "handle gracefully"), undefined terms, missing mockups

Return exactly this shape:
{
  "objective": string,
  "features_to_test": [{"feature": string, "detail": string, "priority": "P1"|"P2"|"P3", "source": string}],
  "scope_in":  [{"item": string, "source": string}],
  "scope_out": [{"item": string, "source": string}],
  "test_environment": {
    "environments": [{"name": string, "purpose": string, "source": string}],
    "platforms": [string],
    "browsers": [string],
    "test_data": [{"item": string, "source": string}]
  },
  "test_strategy": {
    "design_techniques": [{"technique": string, "why": string}],
    "execution_phases": [{"phase": string, "focus": string}]
  },
  "entry_criteria": [string],
  "exit_criteria": [string],
  "risks": [{"risk": string, "mitigation": string, "impact": "high"|"medium"|"low", "likelihood": "high"|"medium"|"low", "source": string}],
  "assumptions": [string],
  "gaps": [{"area": string, "finding": string, "question_for_author": string, "severity": "high"|"medium"|"low"}]
}

"technique" must be one of: ${TECHNIQUES.join(', ')}.
Items in scope_in/scope_out should name test types from: ${TEST_TYPES.join(', ')}.
"gaps[].question_for_author" is the actual question to put to the ticket's reporter — phrase it
so it can be pasted into a Jira comment unchanged.`

function userPrompt(issue) {
  const list = (label, arr, fmt = (x) => x) =>
    arr?.length ? `${label}:\n${arr.map((x) => `- ${fmt(x)}`).join('\n')}` : `${label}: (none stated)`

  return [
    `SOURCE: Jira issue ${issue.key}`,
    `Summary: ${issue.summary || '(empty)'}`,
    `Type: ${issue.issue_type}   Status: ${issue.status}   Priority: ${issue.priority}`,
    `Reporter: ${issue.reporter ?? '(unset)'}   Assignee: ${issue.assignee ?? '(unassigned)'}`,
    `Due date: ${issue.due_date ?? '(none set — the ticket carries no schedule)'}`,
    list('Components', issue.components),
    list('Labels', issue.labels),
    list('Fix versions', issue.fix_versions),
    issue.parent ? `Parent: ${issue.parent.key} — ${issue.parent.summary}` : 'Parent: (none)',
    list('Subtasks', issue.subtasks, (s) => `${s.key} [${s.status}] ${s.summary}`),
    list('Linked issues', issue.links, (l) => `${l.type} ${l.key} — ${l.summary}`),
    list('Attachments', issue.attachments, (a) => a.filename),
    '',
    'DESCRIPTION (verbatim):',
    issue.description_md || '(the source has no description — this is itself a high-severity gap)',
    '',
    issue.acceptance_criteria?.length
      ? `ACCEPTANCE CRITERIA (stated in ${issue.ac_source}):\n${issue.acceptance_criteria.map((a, i) => `[${i}] ${a}`).join('\n')}`
      : 'ACCEPTANCE CRITERIA: NONE STATED. Record this in "gaps" with severity "high". Do not invent them.',
    '',
    issue.comments?.length
      ? `COMMENTS (context, weaker authority than the description):\n${issue.comments.map((c) => `--- ${c.author} @ ${c.created}\n${c.body_md}`).join('\n')}`
      : 'COMMENTS: (none)',
    '',
    'Note: this ticket contains no schedule dates, no staffing, no environment URLs and no tool',
    'choices. Do not supply any. Record them as gaps where the plan needs them.',
  ].join('\n')
}

// ---- validation (llm.md R-06: schema or nothing) --------------------------------

const str = (v) => typeof v === 'string' && v.trim().length > 0
const arr = (v) => Array.isArray(v)

export function validateTestPlan(p) {
  const errors = []
  const need = (cond, msg) => { if (!cond) errors.push(msg) }

  need(str(p?.objective), 'objective must be a non-empty string')

  for (const k of ['features_to_test', 'scope_in', 'scope_out', 'entry_criteria',
    'exit_criteria', 'risks', 'assumptions', 'gaps']) {
    need(arr(p?.[k]), `${k} must be an array`)
  }
  need(arr(p?.features_to_test) && p.features_to_test.length > 0,
    'features_to_test must contain at least one entry')

  ;(p?.features_to_test ?? []).forEach((f, i) => {
    need(str(f?.feature), `features_to_test[${i}].feature missing`)
    need(['P1', 'P2', 'P3'].includes(f?.priority), `features_to_test[${i}].priority must be P1/P2/P3`)
    need(str(f?.source), `features_to_test[${i}].source missing (rule R-02: traceability)`)
  })

  need(p?.test_environment && typeof p.test_environment === 'object',
    'test_environment must be an object')
  for (const k of ['environments', 'platforms', 'browsers', 'test_data']) {
    need(arr(p?.test_environment?.[k]), `test_environment.${k} must be an array`)
  }

  need(p?.test_strategy && typeof p.test_strategy === 'object', 'test_strategy must be an object')
  need(arr(p?.test_strategy?.design_techniques), 'test_strategy.design_techniques must be an array')
  need(arr(p?.test_strategy?.execution_phases), 'test_strategy.execution_phases must be an array')

  ;(p?.risks ?? []).forEach((r, i) => {
    need(str(r?.risk), `risks[${i}].risk missing`)
    need(str(r?.mitigation), `risks[${i}].mitigation missing`)
    need(LEVELS.includes(r?.impact), `risks[${i}].impact must be high/medium/low`)
    need(LEVELS.includes(r?.likelihood), `risks[${i}].likelihood must be high/medium/low`)
  })

  ;(p?.gaps ?? []).forEach((g, i) => {
    need(str(g?.area), `gaps[${i}].area missing`)
    need(str(g?.finding), `gaps[${i}].finding missing`)
    need(str(g?.question_for_author), `gaps[${i}].question_for_author missing`)
    need(LEVELS.includes(g?.severity), `gaps[${i}].severity must be high/medium/low`)
  })

  return errors
}

/** Deterministic post-pass: stamp identity and enforce the R-01 gap invariants in code. */
function seal(plan, issue) {
  plan.schema_version = '2.0'
  plan.issue_key = issue.key
  plan.issue_url = issue.url
  plan.generated_at = new Date().toISOString()

  const has = (re) => plan.gaps.some((g) => re.test(g.area) || re.test(g.finding))

  // The model is told to record these. Code guarantees it — the whole architecture in
  // miniature: ask the model to behave, then verify deterministically that it did.
  if (!issue.acceptance_criteria?.length && !has(/acceptance/i)) {
    plan.gaps.unshift({
      area: 'Acceptance criteria',
      finding: `${issue.key} states no testable acceptance criteria.`,
      question_for_author: `What are the acceptance criteria for ${issue.key}? What observable outcome makes this pass or fail?`,
      severity: 'high',
    })
  }
  if (!issue.description_md && !has(/description/i)) {
    plan.gaps.unshift({
      area: 'Requirement description',
      finding: `${issue.key} has an empty description.`,
      question_for_author: `Could you add a description to ${issue.key} covering the intended behaviour?`,
      severity: 'high',
    })
  }
  // A Jira ticket never carries a schedule. If the plan pretends otherwise, say so.
  if (!issue.due_date && !has(/schedule|date|timeline/i)) {
    plan.gaps.push({
      area: 'Test schedule',
      finding: 'The ticket carries no due date or milestones, so the schedule in §8 is unpopulated.',
      question_for_author: `What is the target test window for ${issue.key}?`,
      severity: 'medium',
    })
  }
  return plan
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * How long to wait before retrying a 429. Groq sends `retry-after` in seconds, and also
 * states the wait in the error body ("Please try again in 41.6025s"). Prefer the header,
 * fall back to parsing the body, and cap the wait so a run cannot hang indefinitely.
 */
function retryDelayMs(res, body) {
  const header = Number(res.headers?.get?.('retry-after'))
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000 + 500, 70_000)
  const m = /try again in ([\d.]+)s/i.exec(body)
  if (m) return Math.min(Number(m[1]) * 1000 + 500, 70_000)
  return 10_000
}

async function callGroq({ apiKey, model }, messages, { onWait } = {}) {
  let res
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        temperature: 0,                       // llm.md I-06: determinism
        // Groq's free tier caps tokens-per-minute at 8000, and the reserved completion budget
        // counts toward that ceiling — not just the tokens actually generated. At 8000 the
        // request is rejected with a 413 before the model ever runs. Raise it on a paid tier.
        max_completion_tokens: 5000,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(180_000),
    })
  } catch (e) {
    const err = new Error(`Could not reach Groq: ${e.message}`)
    err.status = 502; err.code = 'GROQ_UNREACHABLE'
    err.hint = 'Check your network. The request also times out after 180s.'
    throw err
  }

  const body = await res.text()

  // The free tier's tokens-per-minute window is small enough that a normal ticket trips it.
  // Waiting out a stated window is the correct behaviour, not an error to hand the user.
  // Once only — a second 429 means sustained pressure, and that is worth surfacing.
  if (res.status === 429) {
    const waitMs = retryDelayMs(res, body)
    onWait?.(waitMs)
    await sleep(waitMs)
    return callGroq({ apiKey, model }, messages)   // no onWait: this retry does not wait again
  }

  if (!res.ok) {
    const err = new Error(`Groq returned HTTP ${res.status}: ${body.slice(0, 400)}`)
    err.status = res.status
    err.code = { 401: 'GROQ_401', 413: 'GROQ_413', 429: 'GROQ_429' }[res.status] ?? 'GROQ_ERROR'
    err.hint = {
      401: 'Check the Groq API key in Settings (console.groq.com/keys).',
      // 413 here means the tokens-per-minute ceiling, not an oversized body. The reserved
      // completion budget counts toward it, so a big ticket plus a big budget trips it.
      413: 'The ticket is too large for the free tier’s 8000 tokens-per-minute limit. ' +
        'Wait a minute and retry, use a ticket with a shorter description, or upgrade at ' +
        'console.groq.com/settings/billing.',
      429: 'Groq rate limit hit. Wait a few seconds and retry.',
    }[res.status] ?? 'Check that the model id is available on your Groq account.'
    throw err
  }

  const json = JSON.parse(body)
  const content = json.choices?.[0]?.message?.content ?? ''
  return { content, usage: json.usage ?? null }
}

/** Strip a fence if the model adds one despite being told not to. */
function parseJsonLoose(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
  throw new Error('model did not return parseable JSON')
}

export async function generateTestPlan(issue, groq) {
  if (!groq?.apiKey) {
    const e = new Error('No Groq API key configured.')
    e.status = 400; e.code = 'GROQ_NO_KEY'
    e.hint = 'Add it under Settings → Groq. Get one free at console.groq.com/keys.'
    throw e
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt(issue) },
  ]

  let lastErrors = null
  let usage = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { content, usage: u } = await callGroq(groq, messages, {
      onWait: (ms) => console.log(`  … Groq TPM limit reached, waiting ${(ms / 1000).toFixed(0)}s`),
    })
    usage = u
    let parsed
    try {
      parsed = parseJsonLoose(content)
    } catch (e) {
      lastErrors = [e.message]
      messages.push({ role: 'assistant', content: content.slice(0, 2000) })
      messages.push({ role: 'user', content: 'That was not valid JSON. Return ONLY the JSON object, no fence, no prose.' })
      continue
    }

    const errors = validateTestPlan(parsed)
    if (errors.length === 0) return { plan: seal(parsed, issue), usage, attempts: attempt }

    // One retry, with the validation errors fed back (llm.md R-06). Then hard-fail.
    // Logged because a retry costs a second call against a tight tokens-per-minute budget —
    // a recurring validation failure is a prompt bug worth fixing, not background noise.
    console.log(`  … attempt ${attempt} failed validation: ${errors.join('; ')}`)
    lastErrors = errors
    messages.push({ role: 'assistant', content: JSON.stringify(parsed).slice(0, 4000) })
    messages.push({
      role: 'user',
      content: `That JSON failed schema validation:\n${errors.map((e) => `- ${e}`).join('\n')}\nReturn the corrected JSON object only.`,
    })
  }

  const e = new Error('The model could not produce a schema-valid test plan after a retry.')
  e.status = 502; e.code = 'PLAN_INVALID'
  e.hint = `Validation errors: ${(lastErrors ?? []).join('; ')}`
  throw e
}
