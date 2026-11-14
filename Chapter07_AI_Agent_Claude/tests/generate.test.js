// Tests the generative step's guardrails with a stubbed Groq. No network (llm.md I-07).
// What matters here is not "does the model work" but "does the fence around it hold".

import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateTestPlan } from '../server/tools/generatePlan.js'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

const ISSUE_NO_AC = {
  key: 'KAN-6', url: 'https://acme.atlassian.net/browse/KAN-6',
  summary: 'Show only the active requests', issue_type: 'Task', status: 'To Do', priority: 'Medium',
  components: [], labels: [], fix_versions: [], subtasks: [], links: [], attachments: [],
  reporter: 'A. Reporter', assignee: null, due_date: null,
  description_md: 'Only active suppression filters should appear in the dropdown.',
  acceptance_criteria: [], comments: [],
}

const plan = (over = {}) => ({
  objective: 'Verify only active filters are selectable.',
  features_to_test: [
    { feature: 'Filter dropdown', detail: 'Only active filters listed', priority: 'P1', source: 'description' },
  ],
  scope_in: [{ item: 'Functional Testing', source: 'description' }],
  scope_out: [],
  test_environment: { environments: [], platforms: [], browsers: [], test_data: [] },
  test_strategy: {
    design_techniques: [{ technique: 'Equivalence Partitioning', why: 'Active vs inactive' }],
    execution_phases: [{ phase: 'Functional Testing', focus: 'Dropdown' }],
  },
  entry_criteria: [], exit_criteria: [], assumptions: [], risks: [], gaps: [],
  ...over,
})

/** Queue of response bodies; each call to fetch pops one. */
function stubGroq(bodies) {
  let i = 0
  const calls = []
  globalThis.fetch = async (_url, opts) => {
    calls.push(JSON.parse(opts.body))
    const content = bodies[Math.min(i++, bodies.length - 1)]
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 1 } }),
    }
  }
  return calls
}

test('stamps plan identity from the issue, not from the model', async () => {
  stubGroq([JSON.stringify(plan())])
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.equal(out.issue_key, 'KAN-6')
  assert.equal(out.issue_url, 'https://acme.atlassian.net/browse/KAN-6')
  assert.equal(out.schema_version, '2.0')
  assert.ok(out.generated_at)
})

test('R-01 is enforced in code: a missing-AC gap is inserted even if the model omits it', async () => {
  stubGroq([JSON.stringify(plan({ gaps: [] }))])   // model returns no gaps at all
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  const ac = out.gaps.find((g) => /acceptance/i.test(g.area))
  assert.ok(ac, 'the missing-AC gap must be added')
  assert.equal(ac.severity, 'high')
  assert.match(ac.question_for_author, /KAN-6/)
})

test('does not duplicate the AC gap when the model already recorded one', async () => {
  stubGroq([JSON.stringify(plan({
    gaps: [{ area: 'Acceptance criteria', finding: 'None stated.', question_for_author: 'What are they?', severity: 'high' }],
  }))])
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.equal(out.gaps.filter((g) => /acceptance/i.test(g.area)).length, 1)
})

test('an empty description also forces a high-severity gap', async () => {
  stubGroq([JSON.stringify(plan({ gaps: [] }))])
  const issue = { ...ISSUE_NO_AC, description_md: '' }
  const { plan: out } = await generateTestPlan(issue, { apiKey: 'k' })
  const d = out.gaps.find((g) => /description/i.test(g.area))
  assert.ok(d && d.severity === 'high')
})

test('a ticket with no due date forces a schedule gap — a plan must not imply a timeline', async () => {
  stubGroq([JSON.stringify(plan({ gaps: [] }))])
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.ok(out.gaps.some((g) => /schedule/i.test(g.area)))
})

test('strips a markdown fence the model was told not to add', async () => {
  stubGroq(['```json\n' + JSON.stringify(plan()) + '\n```'])
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.equal(out.objective, 'Verify only active filters are selectable.')
})

test('retries once with the validation errors, then succeeds', async () => {
  const bad = plan()
  bad.features_to_test[0].priority = 'URGENT'          // invalid enum
  const calls = stubGroq([JSON.stringify(bad), JSON.stringify(plan())])

  const { plan: out, attempts } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.equal(attempts, 2)
  assert.equal(out.features_to_test[0].priority, 'P1')

  const retryMessages = calls[1].messages
  const feedback = retryMessages[retryMessages.length - 1].content
  assert.match(feedback, /failed schema validation/)
  assert.match(feedback, /priority/, 'the actual validation error is fed back to the model')
})

test('hard-fails after a second invalid response rather than emitting a partial plan', async () => {
  const bad = plan({ features_to_test: [] })
  stubGroq([JSON.stringify(bad), JSON.stringify(bad)])
  await assert.rejects(
    () => generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' }),
    (e) => e.code === 'PLAN_INVALID' && /at least one/.test(e.hint),
  )
})

test('refuses to call Groq at all without a key', async () => {
  globalThis.fetch = () => assert.fail('should not have made a request')
  await assert.rejects(() => generateTestPlan(ISSUE_NO_AC, {}), (e) => e.code === 'GROQ_NO_KEY')
})

test('surfaces a 401 from Groq with an actionable hint', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'invalid api key' })
  await assert.rejects(
    () => generateTestPlan(ISSUE_NO_AC, { apiKey: 'bad' }),
    (e) => e.code === 'GROQ_401' && /console\.groq\.com/.test(e.hint),
  )
})

// Real limit, hit on the free tier: the reserved completion budget counts toward the
// tokens-per-minute ceiling, so a large ticket is rejected before the model runs.
test('surfaces a 413 as a token-per-minute limit, not an oversized request body', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 413, text: async () => 'rate_limit_exceeded' })
  await assert.rejects(
    () => generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' }),
    (e) => e.code === 'GROQ_413' && /tokens-per-minute/.test(e.hint),
  )
})

test('waits out a 429 and retries instead of failing', async () => {
  let call = 0
  globalThis.fetch = async () => {
    if (++call === 1) {
      return {
        ok: false, status: 429,
        headers: { get: () => null },
        text: async () => 'Please try again in 0.01s',   // parsed from the body
      }
    }
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan()) } }] }),
    }
  }
  const { plan: out } = await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  assert.equal(call, 2, 'it should have retried exactly once')
  assert.equal(out.issue_key, 'KAN-6')
})

test('sends temperature 0 and JSON mode, and never leaks raw Jira JSON into the prompt', async () => {
  const calls = stubGroq([JSON.stringify(plan())])
  await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k', model: 'openai/gpt-oss-120b' })
  const body = calls[0]
  assert.equal(body.temperature, 0)
  assert.equal(body.model, 'openai/gpt-oss-120b')
  assert.deepEqual(body.response_format, { type: 'json_object' })
  const userMsg = body.messages.find((m) => m.role === 'user').content
  assert.match(userMsg, /ACCEPTANCE CRITERIA: NONE STATED/)
  assert.ok(!/"fields"\s*:/.test(userMsg), 'the model must never see raw Jira JSON')
})

test('the prompt tells the model to write a plan, not test cases', async () => {
  const calls = stubGroq([JSON.stringify(plan())])
  await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  const sys = calls[0].messages.find((m) => m.role === 'system').content
  assert.match(sys, /It is NOT a list of test cases/)
  assert.match(sys, /Do NOT write\nstep-by-step test steps/)
})

// The schema hint must not be valid JSON of the wrong shape: an enum rendered as an array
// literal gets produced as an array. Cost a wasted retry on every run until fixed.
test('the prompt renders enums as string unions, never as array literals', async () => {
  const calls = stubGroq([JSON.stringify(plan())])
  await generateTestPlan(ISSUE_NO_AC, { apiKey: 'k' })
  const sys = calls[0].messages.find((m) => m.role === 'system').content
  assert.ok(!/"priority": \["/.test(sys) && !/"severity": \["/.test(sys),
    'an enum shown as a JSON array will be returned as an array')
  assert.match(sys, /"priority": "P1"\|"P2"\|"P3"/)
})
