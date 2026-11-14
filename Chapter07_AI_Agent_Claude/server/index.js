// Layer 2 / Navigation. Routes data between tools in the right order and does no business
// logic of its own. It also exists for a hard technical reason: the browser cannot call Jira
// (no CORS for Basic auth) or Groq directly, and an API token must never be shipped into
// browser JavaScript. Credentials live here and in .env — never in the bundle.

import express from 'express'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { verifyJira, fetchIssue } from './tools/fetchJira.js'
import { normalizeIssue } from './tools/normalizeIssue.js'
import { generateTestPlan, DEFAULT_MODEL } from './tools/generatePlan.js'
import { renderMarkdown } from './tools/renderPlan.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUTPUT_DIR = resolve(ROOT, 'output')
const TMP_DIR = resolve(ROOT, '.tmp')

const PORT = process.env.PORT || 8787
const app = express()
app.use(express.json({ limit: '2mb' }))

// llm.md I-04: never log a token. Log the shape of the request, not its contents.
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// llm.md I-05: fail loud, never half-write. Every failure comes back in one envelope shape.
const fail = (res, e) => {
  console.error(`  ✗ ${e.code ?? 'ERROR'}: ${e.message}`)
  res.status(e.status ?? 500).json({
    ok: false,
    code: e.code ?? 'ERROR',
    message: e.message,
    hint: e.hint ?? null,
  })
}

const jiraCfg = (b) => ({ baseUrl: b?.baseUrl, email: b?.email, token: b?.token })

// llm.md I-03: every stage is dumped to .tmp/ so a bad plan can be debugged by opening a
// file rather than re-running the pipeline with print statements. Best-effort — never fatal.
async function dump(name, data) {
  try {
    await mkdir(TMP_DIR, { recursive: true })
    await writeFile(resolve(TMP_DIR, name), JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.warn(`  ! could not write .tmp/${name}: ${e.message}`)
  }
}

// --- Phase 2 "Link": handshakes -------------------------------------------------

app.post('/api/jira/verify', async (req, res) => {
  try {
    res.json(await verifyJira(jiraCfg(req.body)))
  } catch (e) { fail(res, e) }
})

app.post('/api/groq/verify', async (req, res) => {
  try {
    const { apiKey, model } = req.body ?? {}
    if (!apiKey) throw Object.assign(new Error('No Groq API key provided.'),
      { status: 400, code: 'GROQ_NO_KEY', hint: 'Get one free at console.groq.com/keys.' })

    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) throw Object.assign(new Error(`Groq returned HTTP ${r.status}.`),
      { status: r.status, code: 'GROQ_401', hint: 'Check the key at console.groq.com/keys.' })

    const body = await r.json()
    const ids = (body.data ?? []).map((m) => m.id)
    const wanted = model || DEFAULT_MODEL
    res.json({
      ok: true,
      modelCount: ids.length,
      model: wanted,
      modelAvailable: ids.includes(wanted),
      models: ids.sort(),
    })
  } catch (e) { fail(res, e) }
})

// --- Source: the Jira issue ---------------------------------------------------

app.post('/api/issue', async (req, res) => {
  try {
    const key = String(req.body?.key ?? '').trim()
    const raw = await fetchIssue(jiraCfg(req.body), key)
    await dump(`${raw.issue.key}.raw.json`, raw)
    const issue = normalizeIssue(raw)
    await dump(`${issue.key}.norm.json`, issue)
    res.json({ ok: true, issue })
  } catch (e) { fail(res, e) }
})

// --- The generative step, then deterministic rendering ---------------------------

app.post('/api/generate', async (req, res) => {
  try {
    const { issue, groq } = req.body ?? {}
    if (!issue?.key) throw Object.assign(new Error('No normalized issue supplied.'),
      { status: 400, code: 'NO_ISSUE', hint: 'Fetch a Jira issue first.' })

    const t0 = Date.now()
    const { plan, usage, attempts } = await generateTestPlan(issue, groq)
    plan.model = groq?.model || DEFAULT_MODEL
    const markdown = renderMarkdown(plan, issue)

    await dump(`${issue.key}.plan.json`, plan)
    const high = plan.gaps.filter((g) => g.severity === 'high').length
    console.log(`  ✓ ${issue.key}: ${plan.features_to_test.length} features, ${plan.risks.length} risks, ` +
      `${plan.gaps.length} gaps (${high} high), ${attempts} attempt(s), ${Date.now() - t0}ms`)

    res.json({ ok: true, plan, markdown, usage, attempts, ms: Date.now() - t0 })
  } catch (e) { fail(res, e) }
})

// --- Delivery --------------------------------------------------------------------

app.post('/api/save', async (req, res) => {
  try {
    const { key, markdown, plan } = req.body ?? {}
    if (!key || !markdown) throw Object.assign(new Error('Nothing to save.'),
      { status: 400, code: 'NOTHING_TO_SAVE' })

    // Path safety: the key is the only thing that reaches the filesystem, so constrain it hard.
    const safe = String(key).replace(/[^A-Za-z0-9_-]/g, '')
    if (!safe) throw Object.assign(new Error('Unusable issue key.'), { status: 400, code: 'BAD_KEY' })

    await mkdir(OUTPUT_DIR, { recursive: true })
    const mdPath = resolve(OUTPUT_DIR, `${safe}-test-plan.md`)
    await writeFile(mdPath, markdown, 'utf8')
    if (plan) await writeFile(resolve(OUTPUT_DIR, `${safe}-test-plan.json`), JSON.stringify(plan, null, 2), 'utf8')

    console.log(`  ✓ saved ${mdPath}`)
    res.json({ ok: true, path: mdPath })
  } catch (e) { fail(res, e) }
})

// Convenience: Chapter03 already holds working Jira + Groq credentials. Rather than copying a
// token into this project (I-04 — it would then be one `git add` from being committed), read
// them from where they already live and prefill the Settings dialog. Optional and best-effort:
// if the file is absent the app is configured by hand exactly as before.
const CH03_SETTINGS = resolve(ROOT, '..', 'Chapter03_Local_TestcaseGenerator', 'src', 'config', 'settings.json')

app.get('/api/defaults', async (_req, res) => {
  try {
    const raw = await readFile(CH03_SETTINGS, 'utf8')
    const c = JSON.parse(raw)
    res.json({
      ok: true,
      source: CH03_SETTINGS,
      defaults: {
        baseUrl: c.jira_url ?? '',
        email: c.jira_email ?? '',
        token: c.jira_token ?? '',
        groqApiKey: c.groq_token ?? '',
        groqModel: DEFAULT_MODEL,
      },
    })
  } catch {
    res.json({ ok: true, source: null, defaults: null })   // absent is normal, not an error
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true, defaultModel: DEFAULT_MODEL }))

app.listen(PORT, () => {
  console.log(`\n  B.L.A.S.T. test-plan server on http://localhost:${PORT}`)
  console.log(`  Default model: ${DEFAULT_MODEL}\n`)
})
