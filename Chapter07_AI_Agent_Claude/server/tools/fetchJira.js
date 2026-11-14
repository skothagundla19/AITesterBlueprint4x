// Layer 3 / Tool: talk to Jira. Deterministic. No LLM anywhere in this file.
// SOP: architecture/01_fetch_jira.md

const FIELDS = [
  'summary', 'description', 'issuetype', 'status', 'priority',
  'components', 'labels', 'fixVersions', 'issuelinks', 'attachment',
  'subtasks', 'parent', 'duedate', 'assignee', 'reporter', 'created', 'updated',
].join(',')

function authHeader(email, token) {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

function normBase(baseUrl) {
  const b = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(b)) throw httpError(400, 'BAD_BASE_URL',
    'JIRA base URL must start with https://', 'e.g. https://yourcompany.atlassian.net')
  return b
}

export function httpError(status, code, message, hint) {
  const e = new Error(message)
  e.status = status
  e.code = code
  e.hint = hint
  return e
}

// Jira returns 404 for both "no such issue" and "no permission" — we must not pretend to know which.
function explain(status, key) {
  switch (status) {
    case 400: return ['JIRA_400', `Jira rejected the request for ${key}.`, 'Usually a malformed issue key.']
    case 401: return ['JIRA_401', 'Jira rejected the credentials.',
      'Use your Atlassian account EMAIL (not username) and an API token from id.atlassian.com → Security → API tokens.']
    case 403: return ['JIRA_403', 'Authenticated, but forbidden.',
      'The account may be captcha-locked. Log in via a browser once to clear it.']
    case 404: return ['JIRA_404', `Issue ${key} not found, or your account cannot see that project.`,
      'Jira returns 404 for both cases. Check the key first, then project permissions.']
    case 429: return ['JIRA_429', 'Rate limited by Jira.', 'Wait a moment and retry.']
    default: return ['JIRA_ERROR', `Jira returned HTTP ${status}.`, 'Check the base URL and try again.']
  }
}

async function jiraGet(cfg, path, params = {}) {
  const base = normBase(cfg.baseUrl)
  const url = new URL(base + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let res
  try {
    res = await fetch(url, {
      headers: { Authorization: authHeader(cfg.email, cfg.token), Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw httpError(502, 'JIRA_UNREACHABLE', `Could not reach ${base}: ${e.message}`,
      'Check the base URL, your network, and any VPN or proxy.')
  }

  if (!res.ok) {
    const [code, message, hint] = explain(res.status, params.__key ?? '')
    throw httpError(res.status, code, message, hint)
  }
  return res.json()
}

/** Handshake. The cheapest authenticated call there is — the Phase 2 "Link" gate. */
export async function verifyJira(cfg) {
  const me = await jiraGet(cfg, '/rest/api/3/myself')
  return { ok: true, accountId: me.accountId, displayName: me.displayName, email: me.emailAddress }
}

/** Fetch one issue. Returns raw Jira JSON — normalization is a separate tool. */
export async function fetchIssue(cfg, key) {
  const k = String(key || '').trim().toUpperCase()
  if (!/^[A-Z][A-Z0-9_]+-\d+$/.test(k)) {
    throw httpError(400, 'BAD_KEY',
      key ? `"${key}" is not a Jira issue key.` : 'No Jira issue key was given.',
      'Expected something like KAN-6.')
  }
  const issue = await jiraGet(cfg, `/rest/api/3/issue/${k}`, {
    fields: FIELDS,
    expand: 'renderedFields',
    __key: k,
  })

  // Comments are where acceptance criteria often actually get negotiated. Best-effort:
  // a comment-permission failure must not sink an otherwise good fetch.
  let comments = []
  try {
    const c = await jiraGet(cfg, `/rest/api/3/issue/${k}/comment`, {
      maxResults: 30, orderBy: 'created', expand: 'renderedBody', __key: k,
    })
    comments = c.comments ?? []
  } catch {
    comments = []
  }

  return { issue, comments, baseUrl: normBase(cfg.baseUrl) }
}
