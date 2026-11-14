import { useState } from 'react'
import { api } from './api.js'

const Field = ({ label, hint, ...props }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    <input {...props} />
    {hint && <span className="field-hint">{hint}</span>}
  </label>
)

function Check({ state }) {
  if (!state) return null
  return (
    <div className={`check ${state.ok ? 'ok' : 'bad'}`}>
      {state.ok ? '✓ ' : '✗ '}{state.message}
      {state.hint && <div className="check-hint">{state.hint}</div>}
    </div>
  )
}

export default function Settings({ settings, setSettings, onClose }) {
  const [jiraCheck, setJiraCheck] = useState(null)
  const [groqCheck, setGroqCheck] = useState(null)
  const [busy, setBusy] = useState(null)

  const set = (k) => (e) => setSettings({ ...settings, [k]: e.target.value })

  // Phase 2 "L — Link": verify the connection before trusting it. A broken link fails here,
  // loudly, rather than surfacing as a confusing error halfway through a generation run.
  async function checkJira() {
    setBusy('jira'); setJiraCheck(null)
    try {
      const r = await api.verifyJira(settings)
      setJiraCheck({ ok: true, message: `Connected as ${r.displayName}${r.email ? ` (${r.email})` : ''}` })
    } catch (e) {
      setJiraCheck({ ok: false, message: e.message, hint: e.hint })
    } finally { setBusy(null) }
  }

  async function checkGroq() {
    setBusy('groq'); setGroqCheck(null)
    try {
      const r = await api.verifyGroq({ apiKey: settings.groqApiKey, model: settings.groqModel })
      setGroqCheck({
        ok: r.modelAvailable,
        message: r.modelAvailable
          ? `Connected. ${r.model} is available (${r.modelCount} models on this key).`
          : `Key works, but "${r.model}" is not on this account.`,
        hint: r.modelAvailable ? null : `Available: ${r.models.slice(0, 8).join(', ')}…`,
      })
    } catch (e) {
      setGroqCheck({ ok: false, message: e.message, hint: e.hint })
    } finally { setBusy(null) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          <section>
            <h3>Jira</h3>
            <Field
              label="Base URL"
              placeholder="https://yoursite.atlassian.net"
              value={settings.baseUrl}
              onChange={set('baseUrl')}
              hint="Your Atlassian site root. No trailing path."
            />
            <Field
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={settings.email}
              onChange={set('email')}
              hint="The Atlassian account email — not a username."
            />
            <Field
              label="API token"
              type="password"
              placeholder="ATATT3x…"
              value={settings.token}
              onChange={set('token')}
              hint="id.atlassian.com → Security → Create API token"
            />
            <button className="btn secondary" onClick={checkJira} disabled={busy === 'jira'}>
              {busy === 'jira' ? 'Checking…' : 'Test Jira connection'}
            </button>
            <Check state={jiraCheck} />
          </section>

          <section>
            <h3>Groq</h3>
            <Field
              label="API key"
              type="password"
              placeholder="gsk_…"
              value={settings.groqApiKey}
              onChange={set('groqApiKey')}
              hint="console.groq.com/keys — the free tier covers this model."
            />
            <Field
              label="Model"
              value={settings.groqModel}
              onChange={set('groqModel')}
              hint="openai/gpt-oss-120b is free on Groq and handles JSON mode well."
            />
            <button className="btn secondary" onClick={checkGroq} disabled={busy === 'groq'}>
              {busy === 'groq' ? 'Checking…' : 'Test Groq connection'}
            </button>
            <Check state={groqCheck} />
          </section>

          <p className="note">
            Settings are kept in this browser's <code>localStorage</code> and sent only to the local
            proxy on <code>localhost:8787</code>, which holds the credentials for the outbound calls.
            They are never bundled into the page and never leave your machine except as
            authentication on the Jira and Groq requests themselves.
          </p>
        </div>

        <footer className="modal-foot">
          <button className="btn" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  )
}
