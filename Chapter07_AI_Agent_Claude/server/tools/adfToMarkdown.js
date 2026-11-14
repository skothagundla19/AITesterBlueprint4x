// Layer 3 / Tool: ADF -> Markdown. Deterministic, no network, no LLM.
// SOP: architecture/02_normalize_issue.md
//
// Jira Cloud returns `description` as an Atlassian Document Format tree, not text.
// Handing that JSON blob to a model wastes tokens and loses tables, so we flatten it here.

const MARKS = {
  strong: (s) => `**${s}**`,
  em: (s) => `*${s}*`,
  code: (s) => `\`${s}\``,
  strike: (s) => `~~${s}~~`,
}

function applyMarks(text, marks = []) {
  let out = text
  for (const m of marks) {
    if (m.type === 'link' && m.attrs?.href) out = `[${out}](${m.attrs.href})`
    else if (MARKS[m.type]) out = MARKS[m.type](out)
  }
  return out
}

function inline(nodes = []) {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'text':
          return applyMarks(n.text ?? '', n.marks)
        case 'hardBreak':
          return '\n'
        case 'mention':
          return `@${n.attrs?.text?.replace(/^@/, '') ?? 'user'}`
        case 'emoji':
          return n.attrs?.text ?? n.attrs?.shortName ?? ''
        case 'inlineCard':
          return n.attrs?.url ?? ''
        case 'status':
          return `\`${n.attrs?.text ?? ''}\``
        case 'date':
          return n.attrs?.timestamp ?? ''
        default:
          return n.content ? inline(n.content) : ''
      }
    })
    .join('')
}

function listItems(node, bullet, depth) {
  const pad = '  '.repeat(depth)
  return (node.content ?? [])
    .map((li, i) => {
      const marker = bullet === 'ol' ? `${i + 1}.` : '-'
      // A listItem holds blocks. First block goes on the marker line, rest are indented under it.
      const blocks = (li.content ?? []).map((c) => block(c, depth + 1)).filter(Boolean)
      if (blocks.length === 0) return `${pad}${marker} `
      const [first, ...rest] = blocks
      const head = `${pad}${marker} ${first.trimStart()}`
      return [head, ...rest].join('\n')
    })
    .join('\n')
}

function table(node) {
  const rows = (node.content ?? []).filter((r) => r.type === 'tableRow')
  if (rows.length === 0) return ''
  const cells = (row) =>
    (row.content ?? []).map((c) => inline(flattenCell(c)).replace(/\n+/g, ' ').trim() || ' ')
  const grid = rows.map(cells)
  const width = Math.max(...grid.map((r) => r.length))
  const pad = (r) => [...r, ...Array(width - r.length).fill(' ')]
  const [head, ...body] = grid.map(pad)
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')
}

// Table cells nest paragraphs; pull their inline content up so a cell renders on one line.
function flattenCell(cell) {
  const out = []
  const walk = (n) => {
    if (!n) return
    if (n.type === 'text' || n.type === 'hardBreak' || n.type === 'inlineCard') out.push(n)
    else (n.content ?? []).forEach(walk)
  }
  ;(cell.content ?? []).forEach(walk)
  return out
}

function block(node, depth = 0) {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map((n) => block(n, depth)).filter(Boolean).join('\n\n')
    case 'paragraph':
      return inline(node.content)
    case 'heading': {
      const level = Math.min(6, (node.attrs?.level ?? 1) + 1) // demote: ticket H1 -> plan H2
      return `${'#'.repeat(level)} ${inline(node.content)}`
    }
    case 'bulletList':
      return listItems(node, 'ul', depth)
    case 'orderedList':
      return listItems(node, 'ol', depth)
    case 'taskList':
      return (node.content ?? [])
        .map((t) => `- [${t.attrs?.state === 'DONE' ? 'x' : ' '}] ${inline(t.content)}`)
        .join('\n')
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${inline(node.content)}\n\`\`\``
    case 'blockquote':
      return (node.content ?? [])
        .map((n) => block(n, depth))
        .join('\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'panel':
      return (node.content ?? [])
        .map((n) => block(n, depth))
        .join('\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'rule':
      return '---'
    case 'table':
      return table(node)
    case 'mediaSingle':
    case 'mediaGroup':
      return (node.content ?? [])
        .map((m) => `_[attachment: ${m.attrs?.alt || m.attrs?.id || 'media'}]_`)
        .join('\n')
    case 'expand':
    case 'nestedExpand':
      return `**${node.attrs?.title ?? 'Details'}**\n${(node.content ?? [])
        .map((n) => block(n, depth))
        .join('\n')}`
    default:
      return node.content ? (node.content ?? []).map((n) => block(n, depth)).join('\n') : ''
  }
}

/** Strip Jira's renderedFields HTML down to plain text. Fallback path only. */
export function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {object|string|null} adf  ADF doc (Cloud), or a wiki-markup string (Server).
 * @param {string} renderedHtml     renderedFields fallback.
 * @returns {string} Markdown. Empty string when the ticket genuinely has no description.
 */
export function adfToMarkdown(adf, renderedHtml = '') {
  if (typeof adf === 'string') return adf.trim() // Jira Server: already text
  if (adf && typeof adf === 'object') {
    const md = block(adf).replace(/\n{3,}/g, '\n\n').trim()
    if (md) return md
  }
  return htmlToText(renderedHtml)
}
