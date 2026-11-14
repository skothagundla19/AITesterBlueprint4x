import { useEffect, useState } from 'react'
import Settings from './Settings.jsx'
import { api } from './api.js'

const STORE_KEY = 'blast.settings.v1'
const DEFAULTS = {
  baseUrl: '', email: '', token: '',
  groqApiKey: '', groqModel: 'openai/gpt-oss-120b',
  issueKey: 'KAN-6',
}

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
    // Only let stored values override a default when they actually hold something. A plain
    // spread lets an empty string from a previous session win over a good default, which
    // showed up as the key field silently coming back blank.
    const out = { ...DEFAULTS }
    for (const [k, v] of Object.entries(stored)) if (v !== '' && v != null) out[k] = v
    return out
  } catch {
    return { ...DEFAULTS }
  }
}

const SEV = { high: 'sev-high', medium: 'sev-med', low: 'sev-low' }

function Step({ n, label, state }) {
  return (
    <li className={`step ${state}`}>
      <span className="step-n">{state === 'done' ? '✓' : state === 'fail' ? '✗' : n}</span>
      {label}
    </li>
  )
}

export default function App() {
  const [settings, setSettings] = useState(load)
  const [showSettings, setShowSettings] = useState(false)
  const [issue, setIssue] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [stage, setStage] = useState('idle')       // idle | fetching | generating | done | failed
  const [saved, setSaved] = useState(null)
  const [tab, setTab] = useState('plan')

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(settings)) }, [settings])

  // On first load, offer whatever Chapter03 already has configured. Only fills blanks —
  // anything the user has typed here wins, so this can never clobber their own values.
  useEffect(() => {
    let cancelled = false
    api.defaults().then((r) => {
      if (cancelled || !r.defaults) return
      setSettings((s) => {
        const merged = { ...s }
        for (const [k, v] of Object.entries(r.defaults)) if (!s[k] && v) merged[k] = v
        return merged
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const configured = Boolean(
    settings.baseUrl && settings.email && settings.token && settings.groqApiKey,
  )

  // Layer 2 in the browser: this routes between server tools in order and holds no logic itself.
  async function run() {
    setError(null); setResult(null); setIssue(null); setSaved(null)
    setStage('fetching')
    try {
      const fetched = await api.fetchIssue(settings, settings.issueKey)
      setIssue(fetched.issue)

      setStage('generating')
      const gen = await api.generate(fetched.issue, {
        apiKey: settings.groqApiKey,
        model: settings.groqModel,
      })
      setResult(gen)
      setStage('done')
      setTab('plan')
    } catch (e) {
      setError(e)
      setStage('failed')
    }
  }

  async function save() {
    try {
      const r = await api.save(result.plan.issue_key, result.markdown, result.plan)
      setSaved(r.path)
    } catch (e) { setError(e) }
  }

  function download() {
    const blob = new Blob([result.markdown], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${result.plan.issue_key}-test-plan.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const busy = stage === 'fetching' || stage === 'generating'
  const highGaps = result?.plan.gaps.filter((g) => g.severity === 'high').length ?? 0
  const stepState = (mine) => {
    if (stage === mine) return 'active'
    const finished = { fetching: Boolean(issue), generating: Boolean(result) }
    if (finished[mine]) return 'done'
    // On failure the failed step is the first unfinished one.
    if (stage === 'failed' && (mine === 'fetching' ? !issue : issue)) return 'fail'
    return ''
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Test Plan Creator</h1>
          <p className="sub">B.L.A.S.T. protocol · Jira → Groq <code>{settings.groqModel}</code> → test plan</p>
        </div>
        <button className="btn secondary" onClick={() => setShowSettings(true)}>
          ⚙ Settings{!configured && <span className="dot" title="Not configured" />}
        </button>
      </header>

      <section className="panel">
        <div className="run-row">
          <input
            className="key-input"
            value={settings.issueKey}
            onChange={(e) => setSettings({ ...settings, issueKey: e.target.value.toUpperCase() })}
            placeholder="KAN-6"
            onKeyDown={(e) => e.key === 'Enter' && configured && !busy && run()}
            aria-label="Jira issue key"
          />
          <button className="btn" onClick={run} disabled={!configured || busy}>
            {busy ? 'Working…' : 'Create test plan'}
          </button>
        </div>

        {!configured && (
          <p className="warn">
            Add your Jira base URL, email, API token and Groq key in Settings first.
          </p>
        )}

        {stage !== 'idle' && (
          <ol className="steps">
            <Step n="1" label="Fetch + normalize Jira issue" state={stepState('fetching')} />
            <Step n="2" label="Generate schema-validated plan" state={stepState('generating')} />
          </ol>
        )}

        {error && (
          <div className="error">
            <strong>{error.code}</strong> — {error.message}
            {error.hint && <div className="error-hint">{error.hint}</div>}
          </div>
        )}
      </section>

      {issue && (
        <section className="panel issue">
          <h2>
            <a href={issue.url} target="_blank" rel="noreferrer">{issue.key}</a>
            <span className="issue-summary">{issue.summary}</span>
          </h2>
          <div className="chips">
            <span className="chip">{issue.issue_type}</span>
            <span className="chip">{issue.status}</span>
            <span className="chip">{issue.priority}</span>
            {issue.components.map((c) => <span className="chip alt" key={c}>{c}</span>)}
            {issue.labels.map((l) => <span className="chip alt" key={l}>{l}</span>)}
          </div>
          <p className="meta">
            {issue.acceptance_criteria.length
              ? `${issue.acceptance_criteria.length} acceptance criteria found in ${issue.ac_source}.`
              : 'No acceptance criteria stated — the plan will flag this as a gap rather than invent them.'}
            {issue.description_md ? '' : ' Description is empty.'}
          </p>
        </section>
      )}

      {result && (
        <section className="panel result">
          <div className="result-head">
            <div>
              <h2>Test Plan — {result.plan.issue_key}</h2>
              <p className="meta">
                {result.plan.features_to_test.length} features ·{' '}
                {result.plan.scope_in.length} in scope ·{' '}
                {result.plan.risks.length} risks ·{' '}
                {result.plan.gaps.length} gaps
                {highGaps > 0 && ` (${highGaps} high)`} · {(result.ms / 1000).toFixed(1)}s
                {result.attempts > 1 && ` · ${result.attempts} attempts`}
              </p>
            </div>
            <div className="actions">
              <button className="btn secondary" onClick={download}>Download .md</button>
              <button className="btn" onClick={save}>Save to output/</button>
            </div>
          </div>
          {saved && <div className="saved">Saved to <code>{saved}</code></div>}

          {result.plan.gaps.length > 0 && (
            <div className="gaps">
              <h3>Gaps &amp; questions for the author — unstated in the ticket</h3>
              {result.plan.gaps.map((g, i) => (
                <div key={i} className={`gap ${SEV[g.severity] ?? ''}`}>
                  <strong>{g.area}</strong> — {g.finding}
                  <div className="gap-q">❓ {g.question_for_author}</div>
                </div>
              ))}
            </div>
          )}

          <div className="tabs">
            {['plan', 'markdown', 'json'].map((t) => (
              <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === 'plan' && (
            <div className="plan-view">
              <h3>Objective</h3>
              <p className="objective">{result.plan.objective}</p>

              <h3>Features to be tested</h3>
              {result.plan.features_to_test.map((f, i) => (
                <article key={i} className="scenario">
                  <header>
                    <h4>{f.feature}</h4>
                    <span className={`tag ${f.priority.toLowerCase()}`}>{f.priority}</span>
                  </header>
                  <p className="expected">{f.detail}</p>
                  <p className="derived">source: {f.source}</p>
                </article>
              ))}

              <h3>Scope</h3>
              <div className="two-col">
                <div>
                  <h5>In scope</h5>
                  <ul className="plain">
                    {result.plan.scope_in.map((s, i) => (
                      <li key={i}>{s.item}<span className="derived"> — {s.source}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5>Out of scope</h5>
                  <ul className="plain">
                    {result.plan.scope_out.length
                      ? result.plan.scope_out.map((s, i) => (
                          <li key={i}>{s.item}<span className="derived"> — {s.source}</span></li>
                        ))
                      : <li className="derived">None stated.</li>}
                  </ul>
                </div>
              </div>

              <h3>Risks &amp; mitigation</h3>
              {result.plan.risks.length ? result.plan.risks.map((r, i) => (
                <article key={i} className="scenario">
                  <header>
                    <h4>{r.risk}</h4>
                    <span className="tag">impact {r.impact}</span>
                    <span className="tag">likelihood {r.likelihood}</span>
                  </header>
                  <p className="expected"><b>Mitigation:</b> {r.mitigation}</p>
                  <p className="derived">source: {r.source}</p>
                </article>
              )) : <p className="derived">None identified.</p>}

              <p className="derived footnote">
                The full 14-section document — document info, environment, strategy, schedule,
                deliverables, entry/exit, defect management, roles, approvals — is in the
                <b> markdown</b> tab and in the saved file.
              </p>
            </div>
          )}

          {tab === 'markdown' && <pre className="raw">{result.markdown}</pre>}
          {tab === 'json' && <pre className="raw">{JSON.stringify(result.plan, null, 2)}</pre>}
        </section>
      )}

      {showSettings && (
        <Settings settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
