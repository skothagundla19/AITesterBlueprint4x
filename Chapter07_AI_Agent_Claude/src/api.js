// Thin client over the local proxy. The browser never touches Jira or Groq directly.

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({
    ok: false, code: 'BAD_RESPONSE', message: `Server returned HTTP ${res.status}.`,
    hint: 'Is the proxy running? `npm run dev:server` on port 8787.',
  }))
  if (!res.ok || data.ok === false) throw data
  return data
}


export const api = {
  // Credentials already configured in Chapter03, if that file is present.
  defaults: async () => {
    const res = await fetch('/api/defaults')
    return res.ok ? res.json() : { ok: true, defaults: null }
  },
  verifyJira: (jira) => post('/api/jira/verify', jira),
  verifyGroq: (groq) => post('/api/groq/verify', groq),
  fetchIssue: (jira, key) => post('/api/issue', { ...jira, key }),
  generate: (issue, groq) => post('/api/generate', { issue, groq }),
  save: (key, markdown, plan) => post('/api/save', { key, markdown, plan }),
}
